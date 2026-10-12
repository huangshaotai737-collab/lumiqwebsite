import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const outputDir = path.join(projectRoot, "public/assets/web");

const jobs = [
  {
    input: "public/assets/ola/ola-hero-front.png",
    output: "ola-hero-front.webp",
    width: 1800,
    quality: 70,
    maxBytes: 700_000,
  },
  {
    input: "public/lumiqtab.jpg",
    output: "lumiq-tablet-hero.webp",
    width: 1800,
    quality: 70,
    maxBytes: 700_000,
  },
  {
    input: "public/lumiqpal.png",
    output: "lumiq-ola-card.webp",
    width: 1100,
    quality: 72,
    maxBytes: 450_000,
  },
  {
    input: "public/lumiqbookcover.png",
    output: "lumiq-print-card.webp",
    width: 1100,
    quality: 72,
    maxBytes: 450_000,
  },
  {
    input: "public/assets/products/lumiq-ola-go.png",
    output: "lumiq-ola-go.webp",
    width: 1000,
    quality: 72,
    maxBytes: 250_000,
  },
  {
    input: "public/assets/products/lumiq-tablet.png",
    output: "lumiq-tablet.webp",
    width: 1100,
    quality: 72,
    maxBytes: 300_000,
  },
  {
    input: "public/assets/products/lumiq-print.png",
    output: "lumiq-print.webp",
    width: 1000,
    quality: 72,
    maxBytes: 300_000,
  },
  ...["o", "l", "a"].map((letter) => ({
    input: `public/assets/letters/ola-metal-${letter}.png`,
    output: `ola-metal-${letter}.webp`,
    width: 1000,
    quality: 70,
    maxBytes: 300_000,
  })),
  ...[
    "black-angle",
    "black-front",
    "oak-angle",
    "oak-front",
    "rear",
    "walnut-angle",
    "walnut-front",
  ].map((view) => ({
    input: `public/assets/nest15/nest15-${view}.png`,
    output: `nest15-${view}.webp`,
    width: 1200,
    quality: 72,
    maxBytes: 250_000,
  })),
];

await mkdir(outputDir, { recursive: true });

for (const job of jobs) {
  const inputPath = path.join(projectRoot, job.input);
  const outputPath = path.join(outputDir, job.output);

  await sharp(inputPath)
    .rotate()
    .resize({ width: job.width, withoutEnlargement: true })
    .webp({ quality: job.quality, alphaQuality: 82, effort: 6 })
    .toFile(outputPath);

  const { size } = await stat(outputPath);
  if (size > job.maxBytes) {
    throw new Error(
      `${job.output} is ${size} bytes, above its ${job.maxBytes}-byte budget.`,
    );
  }

  console.log(`${job.output}: ${Math.round(size / 1024)} KB`);
}
