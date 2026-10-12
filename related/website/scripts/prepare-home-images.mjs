import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = "/assets/home-responsive-20260907";
const sources = [
  ...["glass-wordmark-original", "nest15-confirmed", "ola", "tablet", "go", "print", "ola-character"].map(name => `home-interactive/${name}`),
  ...["learn", "connect", "care"].map(name => `home-video/${name}`),
  ...["tablet-pair", "ola-repaired"].map(name => `home-products-refined-20260907/${name}`),
  "home-products-20260907/nest15-angle-confirmed",
  "home-rooms-20260907/room-full-4k",
  ...["tablet", "ola", "print", "ola-go", "nest"].map(name => `home-premium-20260907/${name}-halo`),
  ...["trust-wide", "morning", "afternoon", "evening"].map(name => `home-immersive-2026-09-07/${name}`),
  "home-anchored-2026-09-07/join-crystal",
];

await mkdir(path.join(root, "public", output), { recursive: true });
const manifest = {};
for (const source of sources) {
  const src = `/assets/${source}.webp`;
  const buffer = await readFile(path.join(root, "public", src));
  const metadata = await sharp(buffer).metadata();
  const large = /home-(immersive|rooms|anchored)/.test(source);
  const maxWidth = Math.min(metadata.width, large ? 3840 : 1280);
  const widths = [...new Set([320, 640, 960, 1280, 1920, 2560, 3840].filter(w => w < maxWidth).concat(maxWidth))];
  const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 10);
  const base = `${output}/${path.basename(source)}-${hash}`;
  for (const width of widths) {
    await sharp(buffer).resize({ width, withoutEnlargement: true })
      .webp({ quality: large ? 83 : 86, effort: 5 })
      .toFile(path.join(root, "public", `${base}-${width}.webp`));
  }
  // A small real composition is available in the HTML even with blocked images.
  const preview = await sharp(buffer).resize({ width: large ? 320 : 64, withoutEnlargement: true })
    .webp({ quality: 32, effort: 5 }).toBuffer();
  manifest[src] = { base, widths, preview: `data:image/webp;base64,${preview.toString("base64")}` };
}
await writeFile(path.join(root, "lib/home-image-manifest.json"), JSON.stringify(manifest));
console.log(`Prepared ${sources.length} responsive images with immediate previews.`);
