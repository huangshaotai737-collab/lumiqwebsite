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
  const response = await page.goto(`${process.env.SITE_URL || 'http://localhost:4226'}/zh-hant/products`, {waitUntil: 'domcontentloaded'});
  assert.equal(response.status(), 200);
  const tabs = page.getByRole('tab');
  await tabs.last().waitFor();
  assert.equal(await tabs.count(), 5);
  for (const [index, slug] of ['ola', 'ola-go', 'tablet', 'print', 'nest'].entries()) {
    await tabs.nth(index).click();
    const panel = page.getByRole('tabpanel');
    await panel.getByRole('heading').waitFor();
    assert.ok((await panel.getByRole('heading').innerText()).trim());
    assert.equal(await panel.locator('.prod-product-link').getAttribute('href'), `/zh-hant/products/${slug}`);
    await panel.locator('img').evaluate(image => image.decode());
    assert.ok(await panel.locator('img').evaluate(image => image.complete && image.naturalWidth > 0));
  }
  assert.deepEqual(errors, [], 'Unavailable WebGL must fall back without application errors');
  assert.equal(await page.locator('.prod-carousel canvas').count(), 0);
  await page.goto(`${process.env.SITE_URL || 'http://localhost:4226'}/zh-hant#products`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelector('.lh-home')?.dataset.homeState === 'open');
  await page.locator('#products[data-enhanced="true"]').waitFor();
  await page.locator('#products').scrollIntoViewIfNeeded();
  const cards = await page.locator('.lh-product-slot').evaluateAll(items => items.map(e => {
    const r = e.getBoundingClientRect();
    return {opacity: Number(getComputedStyle(e).opacity), width: r.width, left: r.left, right: r.right, inert: e.inert};
  }));
  assert.equal(cards.filter(card => card.opacity > .5).length, 5, 'Homepage fallback must show all five products');
  for (const card of cards) {
    assert.ok(card.width < 1440 * .25 && card.left >= 0 && card.right <= 1440, 'Fallback products must keep their intended size and fit the viewport');
    assert.equal(card.inert, false, 'All five visible products must remain reachable');
  }
  assert.deepEqual(errors, [], 'Homepage fallback must not emit application errors');
  console.log('PASS: five homepage products and product-page cards stay readable without WebGL or page errors');
} finally {
  await browser.close();
}
