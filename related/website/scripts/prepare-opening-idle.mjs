import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public/assets/home-video");
// Preserve the approved continuous shot. Interpolate only the quiet tail, with
// context on both sides, so slow/reverse playback has more than twelve frames.
execFileSync("ffmpeg", [
  "-hide_banner", "-loglevel", "warning", "-y",
  "-i", path.join(assets, "opening-user-clean-h3-20260907.mp4"),
  "-filter_complex",
  "[0:v]split[opening][tail];" +
  "[opening]trim=end=6,setpts=PTS-STARTPTS[a];" +
  "[tail]trim=start=5.75,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=0.15," +
  "minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1," +
  "trim=start=0.25:end=1.541667,setpts=PTS-STARTPTS[b];" +
  "[a][b]concat=n=2:v=1:a=0[out]",
  "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "19",
  "-pix_fmt", "yuv420p", "-g", "1", "-bf", "0", "-level:v", "5.1",
  "-enc_time_base", "1:120", "-fps_mode", "vfr",
  "-video_track_timescale", "120000", "-movflags", "+faststart",
  path.join(assets, "opening-user-clean-float60-20260907.mp4"),
], { stdio: "inherit" });

// Match the fallback to the quiet hero frame after the light sweep.
const poster = execFileSync("ffmpeg", [
  "-v", "error", "-ss", "3.8", "-i", path.join(assets, "opening-user-clean-float60-20260907.mp4"),
  "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "pipe:1",
], { maxBuffer: 32 * 1024 * 1024 });
await sharp(poster).webp({ quality: 94 }).toFile(path.join(assets, "hero-rest-20260907.webp"));
