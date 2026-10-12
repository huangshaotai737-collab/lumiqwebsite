import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const batch = path.resolve(here, "../../../output/libtv/hero-intro-2026-09-07");
const destination = path.resolve(here, "../public/assets/home-video");
fs.mkdirSync(destination, { recursive: true });
const approved = path.join(batch, "source/hero-approved.png");
const start = path.join(batch, "generated/首屏无字起始参考20260907.png");
const footage = path.join(batch, "generated/LUMIQ玻璃字母逐字入场H3-20260907.mp4");
for (const [source, name] of [
  [approved, "hero-approved-20260907.webp"],
  [start, "hero-intro-start-20260907.webp"],
]) {
  await sharp(source).resize({ width: 2560 }).webp({ quality: 94 })
    .toFile(path.join(destination, name));
}

// All letter motion comes from H3. Remove the long hold and settle onto the
// exact artwork with a 0.24-second blend and a short hold; do not draw letters.
execFileSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", footage, "-loop", "1", "-i", approved,
  "-filter_complex",
  "[0:v]trim=duration=3,setpts=0.8*(PTS-STARTPTS),fps=30,scale=2560:1440,setsar=1,format=yuv420p[v];" +
  "[1:v]scale=2560:1440,fps=30,setsar=1,format=yuv420p[s];" +
  "[v][s]xfade=transition=fade:duration=0.24:offset=2.08[out]",
  "-map", "[out]", "-an", "-t", "2.4", "-c:v", "libx264",
  "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
  "-g", "15", "-movflags", "+faststart",
  path.join(destination, "hero-intro-20260907.mp4"),
], { stdio: "inherit" });
console.log("Prepared approved hero, intro poster and 2.4-second AI intro.");
