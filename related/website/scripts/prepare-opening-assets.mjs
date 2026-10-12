import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const generated = path.join(
  root,
  "output/libtv/opening-video-2026-09-06/clean",
);
const destination = path.resolve(here, "../public/assets/home-video");
fs.mkdirSync(destination, { recursive: true });
for (const [source, target, width] of [
  ["视频首帧产品组合20260906.png", "opening-start", 2560],
  ["视频尾帧品牌背景20260906.png", "opening-end", 2560],
  ["品牌卡片Learn朝向修正20260906.png", "learn", 1200],
  ["品牌卡片Connect共同游戏20260906.png", "connect", 1200],
  ["品牌卡片Care家庭陪伴20260906.png", "care", 1200],
]) {
  const input = path.join(generated, source);
  if (!fs.existsSync(input)) continue;
  await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 94 })
    .toFile(path.join(destination, target + ".webp"));
  console.log(`Exported ${target}.webp`);
}
