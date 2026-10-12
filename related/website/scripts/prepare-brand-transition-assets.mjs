import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const batch = path.resolve(here, "../../../output/libtv/hero-brand-transition-2026-09-07");
const destination = path.resolve(here, "../public/assets/home-video");
await sharp(path.join(batch, "source/brand-end.png"))
  .resize({ width: 2560 }).webp({ quality: 94 })
  .toFile(path.join(destination, "brand-end-20260907.webp"));
execFileSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", path.join(batch, "generated/新首屏到品牌连续过渡H3-20260907.mp4"),
  "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-g", "6", "-keyint_min", "6", "-sc_threshold", "0",
  "-movflags", "+faststart",
  path.join(destination, "hero-brand-scroll-20260907.mp4"),
], { stdio: "inherit" });
console.log("Prepared the separate scroll-driven AI transition and end poster.");
