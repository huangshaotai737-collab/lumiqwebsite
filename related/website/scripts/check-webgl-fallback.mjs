import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

// A browser without WebGL must keep readable product cards, not repeatedly
// attempt renderer creation and emit unhandled application errors.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/i.test(type) ? null : original.call(this, type, ...args);
    };
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(`${process.env.SITE_URL || 'http://localhost:4226'}/zh-hant/products`);
  assert.equal(response.status(), 200);
  await page.locator('.prod-glass-material').first().waitFor();
  await page.waitForTimeout(1200);
  assert.deepEqual(errors, [], 'Unavailable WebGL must fall back without application errors');
  assert.equal(await page.locator('.prod-glass-material canvas').count(), 0);
  assert.ok(await page.getByText('Lumiq Tablet', { exact: true }).count() > 0);
  console.log('PASS: product cards stay readable without WebGL or page errors');
} finally {
  await browser.close();
}
