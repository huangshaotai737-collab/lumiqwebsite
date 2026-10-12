// Export web-sized copies from the verified LibTV 4K originals. No AI re-editing.
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../../output/libtv/trust-waitlist-2026-09-07/clean");
const destination = path.resolve(here, "../public/assets/home-ending-2026-09-07");
const assets = [
  ["信任母子俯视共看-4K.png", "trust-family.webp", 2000, 92],
  ["候补纯背景-4K-正式.png", "join-atmosphere.webp", 2560, 90],
];

await fs.mkdir(destination, { recursive: true });
for (const [name, output, width, quality] of assets) {
  const input = path.join(source, name);
  const info = await sharp(input).metadata();
  if ((info.width ?? 0) * (info.height ?? 0) < 7_500_000) {
    throw new Error(`${name}: source is smaller than the expected LibTV 4K output.`);
  }
  await sharp(input)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality })
    .toFile(path.join(destination, output));
  console.log(`${name}: ${info.width} × ${info.height} → ${output}`);
}
