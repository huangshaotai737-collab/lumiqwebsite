import { test, expect } from "@playwright/test";

test("home is usable without a percentage loading veil", async ({ page }) => {
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".lh-home")).toHaveAttribute("data-home-state", "open");
  await expect(page.locator(".lh-home")).not.toHaveAttribute("inert");
  await expect(page.locator(".lh-loading")).toHaveCount(0);
});

test("vertical input leaves the product floor without advancing cards", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Desktop wheel regression");
  await page.goto("/en");
  const stage = page.locator(".lh-products-stage");
  await expect(page.locator(".lh-products")).toHaveAttribute("data-enhanced", "true");
  await stage.evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top, behavior: "instant" }));
  await page.waitForTimeout(900);
  const selected = await page.locator(".lh-products").getAttribute("data-active-product");
  const start = await page.evaluate(() => scrollY);
  await page.mouse.move(1250, 450);
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(900);
  await page.mouse.wheel(0, 160);
  await page.waitForTimeout(400);
  await expect(page.locator(".lh-products")).toHaveAttribute("data-active-product", selected!);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(start + 100);
});

test("horizontal wheel inertia advances one product, not several", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Desktop wheel regression");
  await page.goto("/en");
  await expect(page.locator(".lh-products")).toHaveAttribute("data-enhanced", "true");
  await page.locator(".lh-products-stage").evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top, behavior: "instant" }));
  await page.waitForTimeout(900);
  const selected = Number(await page.locator(".lh-products").getAttribute("data-active-product"));
  await page.mouse.move(640, 460);
  await page.evaluate(async () => {
    const stage = document.querySelector('.lh-products-stage')!;
    const start = performance.now();
    // Hardware timestamps remain continuous even if a WebGL frame delays delivery.
    for (let i = 0; i < 15; i++) {
      const event = new WheelEvent('wheel', { deltaX: Math.max(2, 65-i*4), bubbles: true, cancelable: true });
      Object.defineProperty(event, 'timeStamp', { value: start+i*70 });
      stage.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 70));
    }
  });
  await expect(page.locator(".lh-products")).toHaveAttribute("data-active-product", String((selected + 1) % 5));
});

test("removed media page has no navigation entry and returns 404", async ({ page }) => {
  await page.goto("/en/story");
  await expect(page.locator('a[href="/en/media"]')).toHaveCount(0);
  const response = await page.goto("/en/media");
  expect(response?.status()).toBe(404);
});
