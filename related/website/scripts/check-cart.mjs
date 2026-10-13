import { chromium, firefox, webkit } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";

const base = process.env.QA_BASE_URL || "http://localhost:4233";
const output = process.env.QA_OUTPUT || "/private/tmp/lumiq-cart-qa-20261013";
await fs.mkdir(output, { recursive: true });
const engines = { chromium, firefox, webkit };
const results = [];
const locales = ["en", "zh-hant", "ja"];
const sizes = [{ width: 320, height: 640 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1024, height: 1280 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }];
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const settleCart = (page) => page.waitForFunction(() => {
  const dialog = document.querySelector('#lumiq-cart');
  return dialog?.open && dialog.getAnimations().every((animation) => ['finished', 'idle'].includes(animation.playState));
});

for (const [engine, driver] of Object.entries(engines)) {
  const browser = await driver.launch();
  try {
    for (const locale of locales) {
      for (const viewport of sizes) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        page.setDefaultTimeout(15000);
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const scenario = `${engine}/${locale}/${viewport.width}x${viewport.height}`;
        try {
          await page.goto(`${base}/${locale}/products/tablet`, { waitUntil: "domcontentloaded" });
          const add = page.locator('[data-cart-add="tablet"]').first();
          await add.waitFor({ state: "visible" });
          await page.waitForFunction(() => !document.querySelector('[data-cart-add="tablet"]')?.disabled);
          const navigation = await page.evaluate(() => {
            const nav = document.querySelector(".site-nav");
            const parts = [...nav.querySelectorAll(".nav-logo, .nav-actions > *")].filter((item) => item.getClientRects().length).map((item) => {
              const r = item.getBoundingClientRect();
              return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
            });
            return { overflow: document.documentElement.scrollWidth > innerWidth + 1, parts, width: innerWidth, transparent: getComputedStyle(document.querySelector('.cart-nav-trigger')).backgroundColor, icon: !!document.querySelector('.cart-nav-trigger > svg.lucide-shopping-cart') };
          });
          assert(!navigation.overflow, "page horizontal overflow");
          assert(navigation.parts.every((part) => part.left >= -1 && part.right <= navigation.width + 1), "navigation leaves viewport");
          assert(navigation.parts.every((part, index) => navigation.parts.every((other, otherIndex) => index === otherIndex || part.right <= other.left + 1 || other.right <= part.left + 1 || part.bottom <= other.top || other.bottom <= part.top)), "navigation controls overlap");
          assert(navigation.icon && navigation.transparent === "rgba(0, 0, 0, 0)", "cart needs transparent SVG icon");
          await add.click();
          const dialog = page.locator("#lumiq-cart");
          await page.waitForFunction(() => document.querySelector('#lumiq-cart')?.open);
          await settleCart(page);
          assert(await dialog.locator('[data-cart-product="tablet"] output').textContent() === "1", "add quantity mismatch");
          const geometry = await dialog.evaluate((element) => {
            const r = element.getBoundingClientRect();
            const panel = element.querySelector('.cart-panel');
            const footer = element.querySelector('.cart-footer').getBoundingClientRect();
            return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: innerWidth, height: innerHeight, overflow: element.scrollWidth > element.clientWidth + 1 || panel.scrollWidth > panel.clientWidth + 1, footerBottom: footer.bottom };
          });
          assert(geometry.left >= -1 && geometry.right <= geometry.width + 1 && geometry.top >= -1 && geometry.bottom <= geometry.height + 1 && !geometry.overflow && geometry.footerBottom <= geometry.height + 1, `cart drawer exceeds viewport: ${JSON.stringify(geometry)}`);
          assert(!await dialog.locator('button, a').evaluateAll((elements) => elements.some((element) => /checkout|結帳|支払う/i.test(element.textContent || ""))), "fake checkout control present");
          if (viewport.width === 320 || viewport.width === 1440) {
            await dialog.locator('[data-cart-product="tablet"] .cart-quantity button').last().click();
            assert(await dialog.locator('[data-cart-product="tablet"] output').textContent() === "2", "quantity increment failed");
            assert((await dialog.locator('.cart-total strong').textContent()).includes("798"), "reference total should be USD 798");
            for (let i = 0; i < 14; i++) {
              await page.keyboard.press('Tab');
              assert(await page.evaluate(() => document.querySelector('#lumiq-cart').contains(document.activeElement)), "focus escapes modal");
            }
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => !document.querySelector('#lumiq-cart')?.open);
            assert(await add.evaluate((button) => document.activeElement === button), "focus should return to add control");
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.querySelector('.cart-nav-count')?.textContent === '2');
            const trigger = page.locator('.cart-nav-trigger');
            await trigger.focus();
            await page.keyboard.press('Enter');
            assert(await dialog.evaluate((element) => element.getAnimations().length === 0), "keyboard drawer should not animate");
            await dialog.locator('[data-cart-product="tablet"] .cart-remove').click();
            await dialog.locator('.cart-empty').waitFor();
            await page.keyboard.press('Escape');
            await page.evaluate(() => localStorage.setItem('lumiq-cart-v1', JSON.stringify({ version: 1, items: [{ id: 'nest', quantity: 1 }, { id: 'ola-go', quantity: 1 }] })));
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForFunction(() => document.querySelector('.cart-nav-count')?.textContent === '2');
            await trigger.click();
            await settleCart(page);
            assert((await dialog.locator('.cart-items').textContent()).includes('Lumiq Orb'), "unpriced product should remain a selection");
            assert(!(await dialog.locator('.cart-total strong').textContent()).includes('USD'), "unpublished products must not be shown as USD 0");
          }
          assert(errors.length === 0, `page errors: ${errors.join('; ')}`);
          if (locale === "zh-hant" && [320, 1440].includes(viewport.width)) await page.screenshot({ path: path.join(output, `${engine}-cart-${viewport.width}.png`) });
          if (viewport.width === 320) {
            await page.keyboard.press('Escape');
            await page.goto(`${base}/${locale}`, { waitUntil: 'domcontentloaded' });
            await page.locator('.cart-nav-trigger').waitFor({ state: 'visible' });
            await page.locator('.cart-nav-trigger').click();
            await page.waitForFunction(() => document.querySelector('#lumiq-cart')?.open);
            await settleCart(page);
            assert(await page.locator('#lumiq-cart [data-cart-product]').count() === 2, 'homepage cart should retain selections across routes');
          }
          results.push({ scenario, status: "passed" });
          console.log(`PASS ${scenario}`);
        } catch (error) {
          results.push({ scenario, status: "failed", error: error.message });
          console.error(`FAIL ${scenario}: ${error.message}`);
          await page.screenshot({ path: path.join(output, `${engine}-${locale}-${viewport.width}-failure.png`) }).catch(() => {});
        } finally { await context.close(); }
      }
    }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    await context.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Storage blocked', 'SecurityError'); }; });
    const page = await context.newPage();
    try {
      await page.goto(`${base}/en/products/tablet`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.querySelector('[data-cart-add="tablet"]')?.disabled);
      await page.locator('[data-cart-add="tablet"]').first().click();
      assert(await page.locator('#lumiq-cart').evaluate((element) => element.getAnimations().length === 0), 'reduced-motion drawer should not translate');
      assert((await page.locator('#cart-local-note').textContent()).includes('blocked local storage'), 'blocked storage must disclose temporary selections');
      assert(await page.locator('[data-cart-product="tablet"] output').textContent() === '1', 'blocked storage must not prevent adding');
      results.push({ scenario: `${engine}/blocked-storage-reduced-motion`, status: 'passed' });
    } catch (error) { results.push({ scenario: `${engine}/blocked-storage-reduced-motion`, status: 'failed', error: error.message }); }
    await context.close();
    const productContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const productPage = await productContext.newPage();
    try {
      for (const id of ['ola', 'ola-go', 'tablet', 'print', 'nest']) {
        await productPage.goto(`${base}/en/products/${id}`, { waitUntil: 'domcontentloaded' });
        await productPage.waitForFunction((id) => !document.querySelector(`[data-cart-add="${id}"]`)?.disabled, id);
        assert(await productPage.locator(`[data-cart-add="${id}"]`).count() === 2, `${id} requires hero and final add controls`);
        await productPage.locator(`[data-cart-add="${id}"]`).first().click();
        await productPage.waitForFunction((id) => document.querySelector(`#lumiq-cart [data-cart-product="${id}"]`) !== null, id);
        await productPage.keyboard.press('Escape');
      }
      await productPage.locator('.cart-nav-trigger').click();
      await settleCart(productPage);
      assert(await productPage.locator('#lumiq-cart [data-cart-product]').count() === 5, 'all five product selections should coexist');
      assert((await productPage.locator('.cart-total strong').textContent()).includes('1,067'), 'three published prices should sum to USD 1,067');
      results.push({ scenario: `${engine}/all-five-products`, status: 'passed' });
    } catch (error) { results.push({ scenario: `${engine}/all-five-products`, status: 'failed', error: error.message }); }
    await productContext.close();
  } finally { await browser.close(); }
}
await fs.writeFile(path.join(output, 'cart-results.json'), JSON.stringify({ base, results }, null, 2));
console.log(`Cart audit: ${results.filter((r) => r.status === 'passed').length}/${results.length} passed`);
if (results.some((r) => r.status === 'failed')) process.exitCode = 1;
