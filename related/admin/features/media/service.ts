import 'server-only';
import { randomUUID } from 'node:crypto';
import { createClient as sdkClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/generated/database';
import type { ApiResult, UUID } from '@/lib/generated/platform/core';
import type { ContentSnapshot, MediaSlot } from '@/lib/generated/platform/content';
import { createClient } from '@/lib/auth/server';
import { requireStaff } from '@/lib/auth/require-staff';
import { enforceRateLimit } from '@/lib/http/rate-limit';
import { HttpError } from '@/lib/http/result';
import { inspectMedia, mediaProfiles, validateUpload, type UploadInput, type MediaMetadata } from './validate';
type Asset = Database['public']['Tables']['media_assets']['Row'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function trusted() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError('UNAVAILABLE', 503);
  return sdkClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (resource, options) => fetch(resource, { ...options, cache: 'no-store' }) } });
}
function sql(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new HttpError('FORBIDDEN', 403);
  if (error.code === 'P0002') throw new HttpError('NOT_FOUND', 404);
  if (error.code === '23505') throw new HttpError('CONFLICT', 409);
  if (error.code === '22023') throw new HttpError('INVALID_INPUT', 400);
  throw new HttpError('UNAVAILABLE', 503);
}
async function result<T>(operation: () => Promise<T>): Promise<ApiResult<T>> { try { return { ok: true, data: await operation() }; } catch (error) { return { ok: false, error: error instanceof HttpError ? error.code : 'UNAVAILABLE', requestId: randomUUID() }; } }
function identity(id: string) { if (!uuid.test(id || '')) throw new HttpError('INVALID_INPUT', 400); }
async function writer(admin = false) { const actor = await requireStaff(admin ? ['admin'] : ['admin', 'editor']); await enforceRateLimit('write', actor.userId); return actor; }
async function assets(id?: string): Promise<Asset[]> {
  const client = await createClient(); const response = await client.rpc('get_media_assets', id ? { asset_id: id } : {}); sql(response.error); return response.data as unknown as Asset[];
}
async function hostLimit(client: ReturnType<typeof trusted>) {
  const bucket = await client.storage.getBucket('media-originals');
  if (bucket.error || !Number.isSafeInteger(bucket.data?.file_size_limit) || !bucket.data?.file_size_limit || bucket.data.public) throw new HttpError('UNAVAILABLE', 503);
  const hostCap = Number(process.env.MEDIA_STORAGE_MAX_BYTES);
  if (!Number.isSafeInteger(hostCap) || hostCap <= 0) throw new HttpError('UNAVAILABLE', 503);
  return Math.min(bucket.data.file_size_limit, hostCap);
}
export async function createUpload(input: UploadInput): Promise<ApiResult<{ assetId: UUID; uploadUrl: string; maxBytes: number }>> {
  return result(async () => {
    await writer(); const service = trusted(); validateUpload(input, await hostLimit(service));
    const client = await createClient(); const created = await client.rpc('create_media_upload', { file_name: input.fileName, advertised_size: input.size, mime: input.mime, usage_key: input.profile }); sql(created.error);
    const asset = created.data as { assetId: string; path: string; maxBytes: number };
    const signed = await service.storage.from('media-originals').createSignedUploadUrl(asset.path, { upsert: false });
    if (signed.error || !signed.data) throw new HttpError('UNAVAILABLE', 503);
    return { assetId: asset.assetId, uploadUrl: signed.data.signedUrl, maxBytes: Math.min(asset.maxBytes, await hostLimit(service)) };
  });
}
export async function completeUpload(input: { assetId: UUID }): Promise<ApiResult<MediaSlot>> {
  return result(async () => {
    const actor = await writer(); identity(input?.assetId); const asset = (await assets(input.assetId))[0];
    if (!asset) throw new HttpError('NOT_FOUND', 404);
    if (asset.created_by !== actor.userId) throw new HttpError('FORBIDDEN', 403);
    if (asset.status !== 'pending') throw new HttpError('CONFLICT', 409);
    const service = trusted(); const cap = await hostLimit(service);
    validateUpload({ fileName: asset.file_name, size: asset.advertised_size, mime: asset.mime, profile: asset.usage_key }, cap);
    const info = await service.storage.from('media-originals').info(asset.original_path);
    if (info.error || info.data?.size !== asset.advertised_size || info.data.size > cap) throw new HttpError('INVALID_INPUT', 400);
    const downloaded = await service.storage.from('media-originals').download(asset.original_path);
    if (downloaded.error || !downloaded.data) throw new HttpError('INVALID_INPUT', 400);
    if (downloaded.data.size !== asset.advertised_size || downloaded.data.size > cap) throw new HttpError('INVALID_INPUT', 400);
    const metadata = await inspectMedia(Buffer.from(await downloaded.data.arrayBuffer()), { fileName: asset.file_name, size: asset.advertised_size, mime: asset.mime, profile: asset.usage_key }, cap);
    const completed = await service.rpc('complete_media_asset', { asset_id: asset.id, actor_id: actor.userId, metadata: metadata as unknown as Json }); sql(completed.error);
    const profile = mediaProfiles[asset.usage_key as keyof typeof mediaProfiles];
    return { assetId: asset.id, url: `/api/media/${asset.id}`, alt: '', kind: profile.kind as 'image' | 'video', profile: profile.profile };
  });
}
/** Copies before attestation. The caller passes the exact version/snapshot it already loaded. */
export async function prepareReleaseAssets(draftId: UUID, expected?: { version: number; snapshot: ContentSnapshot }): Promise<void> {
  const actor = await requireStaff(['admin']); identity(draftId);
  const client = await createClient(); const draft = await client.rpc('get_content_draft', { id: draftId }); sql(draft.error);
  const current = draft.data as unknown as { version: number; snapshot: ContentSnapshot } | null;
  if (!current) throw new HttpError('NOT_FOUND', 404);
  if (expected && (current.version !== expected.version || JSON.stringify(current.snapshot) !== JSON.stringify(expected.snapshot))) throw new HttpError('CONFLICT', 409);
  const service = trusted();
  const releaseBucket = await service.storage.getBucket('media-releases');
  if (releaseBucket.error || !releaseBucket.data || releaseBucket.data.public || !releaseBucket.data.file_size_limit) throw new HttpError('UNAVAILABLE', 503);
  for (const [usage, slot] of Object.entries(current.snapshot.media)) {
    if (!slot.assetId) continue; // Original /assets references are never copied.
    const asset = (await assets(slot.assetId))[0];
    if (!asset || !['ready', 'archived'].includes(asset.status) || asset.usage_key !== usage || !asset.metadata) throw new HttpError('INVALID_INPUT', 400);
    const metadata = asset.metadata as unknown as MediaMetadata;
    const destination = `releases/${asset.id}/${metadata.sha256}`;
    if (!asset.release_path) {
      if (asset.status !== 'ready') throw new HttpError('INVALID_INPUT', 400);
      const downloaded = await service.storage.from('media-originals').download(asset.original_path);
      if (downloaded.error || !downloaded.data) throw new HttpError('UNAVAILABLE', 503);
      const bytes = Buffer.from(await downloaded.data.arrayBuffer());
      const verified = await inspectMedia(bytes, { fileName: asset.file_name, size: asset.advertised_size, mime: asset.mime, profile: usage }, await hostLimit(service));
      if (verified.sha256 !== metadata.sha256) throw new HttpError('INVALID_INPUT', 400);
      const copied = await service.storage.from('media-releases').upload(destination, bytes, { contentType: asset.mime, upsert: false });
      // Existing orphan is reusable only after verifying its exact bytes, never based on its name alone.
      if (copied.error) {
        const orphan = await service.storage.from('media-releases').download(destination);
        if (orphan.error || !orphan.data || Buffer.compare(Buffer.from(await orphan.data.arrayBuffer()), bytes) !== 0) throw new HttpError('UNAVAILABLE', 503);
      }
      const marked = await service.rpc('mark_media_copy', { asset_id: asset.id, actor_id: actor.userId }); sql(marked.error);
    }
  }
}
export async function archiveAsset(assetId: UUID): Promise<ApiResult<null>> { return result(async () => { await writer(); identity(assetId); const client = await createClient(); const archived = await client.rpc('archive_media_asset', { asset_id: assetId }); sql(archived.error); return null; }); }
export async function loadMediaLibrary() {
  await requireStaff(['admin', 'editor']); const service = trusted(); const hostCap = await hostLimit(service);
  const rows = await assets();
  const previews = rows.map(asset => ({ id: asset.id, fileName: asset.file_name, usageKey: asset.usage_key, mime: asset.mime, size: asset.advertised_size, status: asset.status, previewUrl: asset.status === 'pending' ? null : `/api/media/preview?assetId=${asset.id}` }));
  return { assets: previews, hostCap, profiles: Object.entries(mediaProfiles).map(([key, value]) => ({ key, kind: value.kind, profile: value.profile, label: `${'readOnlyReason' in value ? '透明人物（只读）' : value.complex ? (key === 'asset_a4b2063e90484449' ? '开场视频' : '滚动背景视频') : value.kind === 'video' ? '普通影片' : value.companions.length ? '配套封面' : '静态图片'} · ${value.legacyUrl.split('/').pop()!}`, maxBytes: Math.min(hostCap, value.kind === 'image' ? 20971520 : 52428800), mimes: value.mimes, companions: value.companions.map(key => mediaProfiles[key as keyof typeof mediaProfiles].legacyUrl.split('/').pop()!), reason: 'readOnlyReason' in value ? value.readOnlyReason : null, constraints: 'duration' in value ? `${value.width}:${value.height}；${value.duration === null ? '最长 600 秒' : value.duration + ' 秒（±1/24秒）'}；${value.codec}` : `${'width' in value ? `${value.width}:${value.height}；` : ''}JPEG / PNG / WebP` })) };
}

export async function loadMediaOptions() {
  await requireStaff(['admin', 'editor']);
  return (await assets()).filter(asset => asset.status === 'ready').map(asset => ({ id: asset.id, usageKey: asset.usage_key, fileName: asset.file_name }));
}

export async function previewAsset(assetId: string) {
  await requireStaff(['admin', 'editor']); identity(assetId);
  const asset = (await assets(assetId))[0];
  if (!asset || asset.status === 'pending') throw new HttpError('NOT_FOUND', 404);
  const service = trusted(); await hostLimit(service);
  const signed = await service.storage.from('media-originals').createSignedUrl(asset.original_path, 600);
  if (signed.error || !signed.data) throw new HttpError('UNAVAILABLE', 503);
  const response = await fetch(signed.data.signedUrl, { cache: 'no-store' });
  if (!response.ok) throw new HttpError('NOT_FOUND', 404);
  return new Response(response.body, { headers: { 'Content-Type': asset.mime, 'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}
