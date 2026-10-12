import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const url = process.env.LUMIQ_LOADING_URL || 'http://127.0.0.1:4192/en';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => requests.push(request.url()));
  await page.addInitScript(() => {
    window.__homeWebGLContexts = 0;
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (type.startsWith('webgl')) window.__homeWebGLContexts++;
      return getContext.call(this, type, ...args);
    };
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => document.querySelector('#products')?.dataset.enhanced === 'true');
  await page.waitForTimeout(1800);
  assert.equal(await page.evaluate(() => window.__homeWebGLContexts), 0, 'offscreen products must not allocate WebGL during the opening');
  assert.equal(requests.some(url => /GlassCards/.test(url)), false, 'offscreen products must not import the 3D renderer');
  assert.equal(requests.some(url => /films-20260908\/.*\.mp4/.test(url)), false, 'offscreen films must not compete for media bandwidth');
  assert.equal(await page.locator('#products').getAttribute('data-glass-3d'), null, 'real product links stay available before the canvas is ready');
  assert.equal(await page.locator('#products img').first().evaluate(img => img.currentSrc.startsWith('data:')), true, 'offscreen artwork stays on an inline preview');
  const reservedHeight = await page.locator('#products').evaluate(section => section.getBoundingClientRect().height);
  await page.locator('#products').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('.lh-glass-products canvas'), { timeout: 60000 });
  await page.locator('.lh-glass-products a').first().waitFor();
  await page.waitForFunction(() => document.querySelector('#products')?.hasAttribute('data-glass-3d'));
  const readyHeight = await page.locator('#products').evaluate(section => section.getBoundingClientRect().height);
  assert.ok(Math.abs(readyHeight - reservedHeight) < 1, '3D activation must not change the reserved chapter height');
  await page.screenshot({ path: '/tmp/lumiq-loading-products-ready.png' });
  await page.locator('[data-products-next]').click();
  assert.equal(await page.locator('#products').getAttribute('data-active-product'), '1');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(500);
  assert.equal(await page.locator('.lh-home').getAttribute('data-home-state'), 'open');
  await page.screenshot({ path: '/tmp/lumiq-loading-opening.png' });
  await page.locator('#family').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll('#family img')].every(img => img.complete && img.naturalWidth > 1));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  assert.deepEqual(errors, []);
  console.log('PASS: critical-first opening, deferred WebGL/films/images, fast forward/back scroll and product controls');
  await page.locator('#products').scrollIntoViewIfNeeded();
  await page.locator('.lh-glass-products canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await page.waitForTimeout(250);
  assert.equal(await page.locator('.lh-products-viewport').isVisible(), true, 'context loss after initialization restores ordinary cards');
  await context.close();
  const fallbackContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const fallbackPage = await fallbackContext.newPage();
  await fallbackPage.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    let probes = 0;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      // Capability check succeeds; the actual renderer fails to create context.
      if (type.startsWith('webgl') && ++probes > 1) return null;
      return getContext.call(this, type, ...args);
    };
  });
  await fallbackPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await fallbackPage.locator('#products').scrollIntoViewIfNeeded();
  await fallbackPage.waitForTimeout(3000);
  assert.equal(await fallbackPage.locator('.lh-products-viewport').isVisible(), true, 'real renderer failure must retain the ordinary cards');
  assert.equal(await fallbackPage.locator('#products').getAttribute('data-glass-3d'), null);
  await fallbackPage.locator('[data-products-next]').click();
  assert.equal(await fallbackPage.locator('#products').getAttribute('data-active-product'), '1');
  assert.equal(await fallbackPage.locator('#products').innerText().then(text => /WebGL|Error creating/.test(text)), false, 'renderer implementation errors must not enter the product UI');
  await fallbackPage.screenshot({ path: '/tmp/lumiq-loading-webgl-fallback.png' });
  await fallbackContext.close();
  console.log('PASS: capability probe success with real renderer failure retains navigable product fallback');
} finally { await browser.close(); }
