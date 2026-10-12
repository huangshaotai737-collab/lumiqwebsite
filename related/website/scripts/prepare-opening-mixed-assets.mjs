import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const batch = path.resolve(
  here,
  "../../../output/libtv/opening-mixed-clean-brand-h3-2026-09-07",
);
const brand = path.resolve(
  here,
  "../../../output/libtv/brand-curve-layout-4k-2026-09-07",
);
const destination = path.resolve(here, "../public/assets/home-video");

await sharp(path.join(brand, "generated/第二屏曲线背景红框合成4K20260907.png"))
  .resize({ width: 2560 })
  .webp({ quality: 94 })
  .toFile(path.join(destination, "brand-end-clean-20260907.webp"));

// Preserve the entire native H3 timeline. No cuts, retiming, fades or joins.
// Frequent keyframes keep forwards/backwards scroll seeking responsive.
execFileSync("ffmpeg", [
  "-hide_banner", "-loglevel", "error", "-y",
  "-i", path.join(batch, "generated/智能多参清晰第二屏连续H3-20260907.mp4"),
  "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-g", "6", "-keyint_min", "6", "-sc_threshold", "0",
  "-movflags", "+faststart",
  path.join(destination, "opening-mixed-clean-brand-h3-20260907.mp4"),
], { stdio: "inherit" });
console.log("已导出清晰第二屏的智能多参连续影片与备用尾图。");
