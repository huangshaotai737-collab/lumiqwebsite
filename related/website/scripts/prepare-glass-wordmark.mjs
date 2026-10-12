// Export the original rendered wordmark; never substitute a font or regenerate it.
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await sharp(
  path.resolve(
    here,
    "../../../output/imagegen/lumiq-h3-floors-v2/00-loading-glass-lumiq-2k.png",
  ),
)
  .extract({ left: 245, top: 305, width: 1590, height: 385 })
  .webp({ lossless: true })
  .toFile(
    path.resolve(
      here,
      "../public/assets/home-interactive/glass-wordmark-original.webp",
    ),
  );
