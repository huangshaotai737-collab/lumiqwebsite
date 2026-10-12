import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../../output/libtv/opening-user-clean-h3-2026-09-07/generated/H3用户指定无黑边连续视频.mp4");
const destination = path.resolve(here, "../public/assets/home-video");
const duration = Number(execFileSync("ffprobe", [
  "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", source,
], { encoding: "utf8" }).trim());
if (!Number.isFinite(duration) || duration < 3) throw new Error("Invalid opening movie duration");

// Keep the complete AI shot. Independent frames make reverse scrolling responsive.
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", source,
  "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "19",
  "-pix_fmt", "yuv420p", "-g", "1", "-bf", "0", "-movflags", "+faststart",
  path.join(destination, "opening-user-clean-h3-20260907.mp4"),
], { stdio: "inherit" });

for (const [name, time] of [
  ["hero-intro-user-clean", 0],
  ["hero-user-clean", 2.4],
  ["brand-end-user-clean", duration - 0.09],
]) {
  const frame = execFileSync("ffmpeg", [
    "-v", "error", "-ss", String(time), "-i", source,
    "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "pipe:1",
  ], { maxBuffer: 32 * 1024 * 1024 });
  await sharp(frame).webp({ quality: 94 }).toFile(path.join(destination, `${name}-20260907.webp`));
}
