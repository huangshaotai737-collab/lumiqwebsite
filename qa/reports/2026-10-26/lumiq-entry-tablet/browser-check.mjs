import { chromium, firefox, webkit } from "../../../../related/website/node_modules/playwright/index.mjs";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const base = "http://127.0.0.1:4312";
const out = fileURLToPath(new URL(".", import.meta.url));
const results = [];
for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await engine.launch({ headless: true });
  for (const [size, viewport] of Object.entries({
    desktop: { width: 1440, height: 900 },
    phone: { width: 390, height: 844 },
  })) {
    const page = await browser.newPage({ viewport });
    const response = await page.goto(`${base}/zh-hant`, { waitUntil: "domcontentloaded" });
    const initial = await page.locator(".lh-loader").getAttribute("data-state");
    try {
      await page.waitForFunction(() => ["hidden", "error"].includes(document.querySelector(".lh-loader")?.getAttribute("data-state") || ""), undefined, { timeout: 120000 });
    } catch {}
    const home = await page.evaluate(() => ({
      loader: document.querySelector(".lh-loader")?.getAttribute("data-state"),
      percent: document.querySelector(".lh-loader-percent")?.textContent,
      state: document.querySelector(".lh-home")?.getAttribute("data-home-state"),
      images: document.querySelectorAll("img[data-home-image]").length,
      unloaded: [...document.querySelectorAll("img[data-home-image]")].filter(image => !image.complete || !image.naturalWidth).length,
      videoReady: document.querySelector(".lh-opening-video")?.readyState,
      retry: Boolean(document.querySelector(".lh-loader-actions button")),
    }));
    await page.screenshot({ path: `${out}/home-${name}-${size}.png` });
    const media = await page.goto(`${base}/zh-hant/media`, { waitUntil: "domcontentloaded" });
    const tablet = await page.goto(`${base}/zh-hant/products/tablet`, { waitUntil: "domcontentloaded" });
    await page.locator(".pd-scenes-floor").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll(".pd-scenes-floor img")].every(image => image.complete && image.naturalWidth));
    const scenes = await page.locator(".pd-scenes-floor img").evaluateAll(images => images.map(image => ({
      src: image.currentSrc,
      width: image.naturalWidth,
      height: image.naturalHeight,
    })));
    await page.locator(".pd-scenes-floor").screenshot({ path: `${out}/tablet-after-${name}-${size}.png` });
    results.push({ name, size, http: response?.status(), initial, home, media: media?.status(), tablet: tablet?.status(), scenes });
    await page.close();
  }
  await browser.close();
}
await writeFile(`${out}/browser-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
