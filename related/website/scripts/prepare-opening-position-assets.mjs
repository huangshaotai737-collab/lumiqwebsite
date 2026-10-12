import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../../output/libtv/girl-position-smooth-v2-2026-09-07/generated/H3女孩同轴丝滑连续V2.mp4");
const destination = path.resolve(here, "../public/assets/home-video");

// Every frame can be decoded independently for forward and reverse scrolling.
// Preserve the native resolution, frame rate and complete single-shot timeline.
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", source,
  "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "19",
  "-pix_fmt", "yuv420p", "-g", "1", "-bf", "0", "-movflags", "+faststart",
  path.join(destination, "opening-position-h3-20260907.mp4"),
], { stdio: "inherit" });
for (const [name, time] of [["brand-end-position", "7.2"], ["hero-position", "2.4"]]) {
  const frame = execFileSync("ffmpeg", [
    "-v", "error", "-y", "-ss", time, "-i", source,
    "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "pipe:1",
  ], { maxBuffer: 32 * 1024 * 1024 });
  await sharp(frame).webp({ quality: 94 }).toFile(path.join(destination, `${name}-20260907.webp`));
}
