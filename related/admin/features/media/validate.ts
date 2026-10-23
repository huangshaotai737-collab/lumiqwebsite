import 'server-only';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { HttpError } from '@/lib/http/result';
import profiles from './profiles.json';
export type UploadInput = { fileName: string; size: number; mime: string; profile: string };
export type MediaMetadata = { size: number; mime: string; width: number; height: number; duration: number | null; codec: string; alpha: boolean; sha256: string };
export const mediaProfiles = profiles;
export function validateUpload(input: UploadInput, hostCap: number) {
  const profile = typeof input?.profile === 'string' && Object.hasOwn(profiles, input.profile) ? profiles[input.profile as keyof typeof profiles] : undefined;
  if (!profile || ('readOnlyReason' in profile) || typeof input.fileName !== 'string' || !input.fileName.trim() || input.fileName.length > 200 || /[\x00-\x1f/\\]/.test(input.fileName) || !Number.isSafeInteger(hostCap) || hostCap <= 0)
    throw new HttpError('INVALID_INPUT', 400);
  const maxBytes = Math.min(hostCap, profile.kind === 'image' ? 20 * 1024 * 1024 : 50 * 1024 * 1024);
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > maxBytes || !(profile.mimes as string[]).includes(input.mime)) throw new HttpError('INVALID_INPUT', 400);
  return { profile, maxBytes };
}
function headerMime(bytes: Buffer) {
  if (bytes.length >= 12 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.length >= 16 && bytes.toString('ascii', 4, 8) === 'ftyp') return bytes.toString('ascii', 8, 12) === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  if (bytes.subarray(0, 4).equals(Buffer.from([26,69,223,163]))) return 'video/webm';
  return null;
}
export async function inspectMedia(bytes: Buffer, input: UploadInput, hostCap = 50 * 1024 * 1024): Promise<MediaMetadata> {
  const { profile } = validateUpload(input, hostCap);
  if (bytes.length !== input.size || headerMime(bytes) !== input.mime) throw new HttpError('INVALID_INPUT', 400);
  // Explicit deployment capability. Never silently trust browser metadata or a local-machine binary.
  const binary = process.env.MEDIA_FFPROBE_PATH;
  if (!binary || !path.isAbsolute(binary)) throw new HttpError('UNAVAILABLE', 503);
  const folder = await mkdtemp(path.join(tmpdir(), 'lumiq-media-'));
  try {
    const file = path.join(folder, 'upload'); await writeFile(file, bytes);
    const demuxer = ({ 'image/png': 'png_pipe', 'image/jpeg': 'jpeg_pipe', 'image/webp': 'webp_pipe', 'video/mp4': 'mov', 'video/webm': 'matroska' } as Record<string, string>)[input.mime];
    const inputOptions = input.mime === 'video/mp4' ? ['-enable_drefs', '0', '-use_absolute_path', '0'] : [];
    let raw: string;
    try { raw = (await promisify(execFile)(binary, ['-v', 'error', '-protocol_whitelist', 'file', '-format_whitelist', 'mov,png_pipe,jpeg_pipe,webp_pipe,matroska,webm', '-f', demuxer, ...inputOptions, '-show_streams', '-show_format', '-of', 'json', file], { timeout: 15000, maxBuffer: 1024 * 1024 })).stdout; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new HttpError('UNAVAILABLE', 503); throw new HttpError('INVALID_INPUT', 400); }
    const probe = JSON.parse(raw);
    const streams = probe.streams?.filter((stream: { codec_type: string }) => stream.codec_type === 'video');
    const stream = streams?.[0];
    if (streams?.length !== 1 || !Number.isSafeInteger(stream.width) || !Number.isSafeInteger(stream.height) || stream.width <= 0 || stream.height <= 0 || stream.width * stream.height > 67108864) throw new HttpError('INVALID_INPUT', 400);
    const duration = profile.kind === 'video' ? Number(probe.format?.duration) : null;
    const alpha = stream.tags?.alpha_mode === '1' || /a(?:rgb|bgr)|yuva|rgba|bgra/.test(stream.pix_fmt || '');
    if (profile.kind === 'video') {
      const videoProfile = profile as typeof profiles.asset_a4b2063e90484449;
      const rate = String(stream.avg_frame_rate || '').split('/').map(Number);
      const frameRate = rate[0] / rate[1];
      if (stream.pix_fmt !== 'yuv420p' || (videoProfile.complex && (!Number.isFinite(frameRate) || Math.abs(frameRate - videoProfile.frameRate) > 0.001)) || !Number.isFinite(duration) || duration! <= 0 || duration! > 600 || stream.codec_name !== videoProfile.codec || Math.abs(stream.width / stream.height - videoProfile.width / videoProfile.height) > 0.001 ||
        (videoProfile.duration !== null && Math.abs(duration! - videoProfile.duration) > 1 / 24) || (videoProfile.alpha && !alpha)) throw new HttpError('INVALID_INPUT', 400);
    } else if (!['png', 'mjpeg', 'webp'].includes(stream.codec_name) || ('width' in profile && Math.abs(stream.width / stream.height - profile.width / profile.height) > 0.001)) throw new HttpError('INVALID_INPUT', 400);
    return { size: bytes.length, mime: input.mime, width: stream.width, height: stream.height, duration, codec: stream.codec_name, alpha, sha256: createHash('sha256').update(bytes).digest('hex') };
  } finally { await rm(folder, { recursive: true, force: true }); }
}
