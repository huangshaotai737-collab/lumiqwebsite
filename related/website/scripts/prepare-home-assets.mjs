/* Lossless crops / masks of approved artwork, never AI re-generation of a page. */
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../../..");
const out = path.resolve(__dirname, "../public/assets/home-interactive");
fs.mkdirSync(out, { recursive: true });
const crop = async (source, name, rect, width = 1600) =>
  sharp(path.join(root, source))
    .extract(rect)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 92 })
    .toFile(path.join(out, name + ".webp"));
(async () => {
  await crop(
    "output/交付/修改清单与图片汇总-2026-09-06/01-最新确认/Nest15-原木外观与家庭食谱新界面.png",
    "nest15-confirmed",
    { left: 37, top: 394, width: 958, height: 580 },
    1200,
  );
  const brand = "output/交付/甲方反馈改版-2026-09-03/02-品牌故事.png";
  for (const [name, left] of [
    ["learn", 785],
    ["connect", 1185],
    ["care", 1588],
  ])
    await crop(brand, name, { left, top: 305, width: 370, height: 355 }, 740);
  // Original house silhouette; mask removes old labels and product bubbles, preserving the model.
  const housePath =
    "M718 640 L746 552 L900 469 L1138 402 L1138 330 L1401 266 L1612 416 L1612 498 L1763 588 L1746 735 L1320 859 L1255 796 Q1207 758 1150 791 L1080 814 L905 854 L724 761 Z";
  const mask = Buffer.from(
    `<svg width="2048" height="1152"><path d="${housePath}" fill="white"/></svg>`,
  );
  await sharp(
    path.join(root, "output/交付/甲方反馈改版-2026-09-03/04-家庭生态.png"),
  )
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer()
    .then((buf) =>
      sharp(buf)
        .extract({ left: 710, top: 260, width: 1070, height: 615 })
        .webp({ quality: 95 })
        .toFile(path.join(out, "original-house.webp")),
    );
  await crop(
    "output/交付/定向改稿-保留原设计-2026-09-06/生成原图/05.png",
    "trust-family",
    { left: 835, top: 75, width: 790, height: 448 },
  );
  const family =
    "output/libtv/lumiq-8-floor-static/05-family-use-cases-nav.png";
  await crop(
    family,
    "family-panorama",
    { left: 0, top: 347, width: 2048, height: 665 },
    2048,
  );
  // Hero and product deck use the real cutouts, not painted versions of the hardware.
  const originals = {
    ola: "ola/ola-hero-front.png",
    go: "products/lumiq-ola-go.png",
    tablet: "products/lumiq-tablet.png",
    print: "products/lumiq-print.png",
  };
  for (const [name, file] of Object.entries(originals))
    await sharp(path.resolve(__dirname, "../public/assets", file))
      .trim({ threshold: 8 })
      .resize({
        width: 1200,
        height: 1400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 94 })
      .toFile(path.join(out, name + ".webp"));
  const generated = path.join(root, "output/libtv/home-interactive-2026-09-06");
  if (fs.existsSync(path.join(generated, "无字珍珠光效背景.png")))
    await sharp(path.join(generated, "无字珍珠光效背景.png"))
      .webp({ quality: 90 })
      .toFile(path.join(out, "pearl-light.webp"));
  if (fs.existsSync(path.join(generated, "独立OLA角色素材.png"))) {
    const { data, info } = await sharp(
      path.join(generated, "独立OLA角色素材.png"),
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // Chroma key is an export step only. Keep the original character pixels and soften green edges.
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      const excess = g - Math.max(r, b);
      if (excess > 22 && g > 90) {
        data[i + 3] = Math.round(255 * (1 - Math.min(1, (excess - 22) / 65)));
        data[i + 1] = Math.min(g, Math.max(r, b) + 8);
      }
    }
    await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .trim({ threshold: 6 })
      .resize({ height: 1500, withoutEnlargement: true })
      .webp({ quality: 94 })
      .toFile(path.join(out, "ola-character.webp"));
  }
  console.log("Prepared original homepage assets.");
})();
