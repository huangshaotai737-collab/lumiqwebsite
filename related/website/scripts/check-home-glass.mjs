import assert from "node:assert/strict";
import { chromium } from "playwright";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://127.0.0.1:4211/en");
  await page.locator(".lh-glass-products canvas").waitFor({ timeout: 60000 });
  await page.locator("#products").scrollIntoViewIfNeeded();
  await page.locator(".lh-glass-products a").first().waitFor();
  await page.waitForTimeout(1200);
  assert.equal(await page.locator(".lh-products-viewport").isVisible(), false);
  const active = () => page.locator("#products").getAttribute("data-active-product");
  const moveTo = async locator => {
    const rect = await locator.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  };
  await moveTo(page.locator('.lh-glass-products [data-active="true"] a'));
  await page.waitForTimeout(1300);
  assert.equal(await active(), "0", "Hovering the center must not switch products");
  await moveTo(page.locator('.lh-glass-products a[href="/en/products/ola"]'));
  await page.waitForTimeout(150);
  assert.equal(await active(), "0", "Side hover must not switch immediately");
  await moveTo(page.locator('.lh-glass-products [data-active="true"] a'));
  await page.waitForTimeout(850);
  assert.equal(await active(), "0", "Leaving the side cancels the pending switch");
  await moveTo(page.locator('.lh-glass-products a[href="/en/products/ola"]'));
  await page.waitForTimeout(550);
  assert.equal(await active(), "1", "Side dwell should switch after 420ms");
  await page.waitForTimeout(2200);
  assert.equal(await active(), "1", "A stationary pointer must not cascade through products");
  await page.mouse.move(20, 150);
  assert.deepEqual(await page.locator("#products, #films, #experiences").evaluateAll(es => es.map(e => e.id)),
    ["products", "films", "experiences"], "Films must follow products, with the room afterwards");
  assert.deepEqual(await page.locator(".lh-glass-products .glass-sample-content").evaluateAll(es => es.map(e => Number(e.dataset.scale)).sort()), [.66, .66, .7, .7, 1.2]);
  const names = new Set();
  for (let i = 0; i < 5; i++) {
    const link = page.locator('.lh-glass-products [data-active="true"] a');
    names.add(await link.getAttribute("href"));
    assert.match(await link.getAttribute("href"), /^\/en\/products\//);
    assert.equal(await page.locator(".lh-glass-products a").count(), 5);
    await page.locator("[data-products-next]").click();
    await page.waitForTimeout(750);
  }
  assert.equal(names.size, 5, "All five products remain reachable");
  const wrapped = page.locator('.lh-glass-products [data-offset="-2"] a');
  const href = await wrapped.getAttribute("href");
  await page.locator("[data-products-next]").click();
  const moved = page.locator(`.lh-glass-products a[href="${href}"]`);
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(50);
    const box = await moved.boundingBox();
    assert.ok(Math.abs(box.x + box.width / 2 - 800) > 350, "Wrapped card must never travel across the foreground");
  }
  await page.screenshot({ path: "/tmp/lumiq-home-glass-final.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  assert.equal(await page.locator(".lh-products-viewport").isVisible(), true);
  assert.equal(await page.locator(".lh-glass-products canvas").count(), 0);
  assert.equal(await page.locator(".lh-product-slot a").count(), 5);
  assert.deepEqual(errors, []);
  console.log("Home glass: five-product cycle, localized links, desktop material, mobile fallback and no runtime errors passed.");
} finally { await browser.close(); }
