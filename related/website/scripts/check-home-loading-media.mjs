import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const url = process.env.LUMIQ_LOADING_URL || 'http://127.0.0.1:4192/en';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const entry of ['hash', 'fast-jump']) {
    const playback = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const filmPage = await playback.newPage();
    await filmPage.route('**/films-20260908/welcome-home.jpg', route => route.abort());
    await filmPage.goto(entry === 'hash' ? `${url}#films` : url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await filmPage.waitForFunction(() => document.querySelector('#products')?.dataset.enhanced === 'true');
    if (entry === 'fast-jump') await filmPage.locator('#films').scrollIntoViewIfNeeded();
    await filmPage.locator('.lh-film-toggle').click();
    await filmPage.waitForFunction(() => {
      const video = document.querySelector('.lh-film-card video');
      return video && !video.paused && video.currentTime > .1;
    }, null, { timeout: 15000 });
    assert.equal(await filmPage.locator('.lh-film-open').count(), 0, `${entry}: first click must play without a false media error`);
    await filmPage.waitForFunction(() => document.querySelector('#films img[data-home-image-state="error"]'));
    await filmPage.locator('.lh-films-controls button').last().click();
    await filmPage.waitForFunction(() => document.querySelector('.lh-film-card')?.getAttribute('aria-label') === '2 / 3');
    await filmPage.locator('.lh-film-toggle').click();
    await filmPage.waitForFunction(() => {
      const video = document.querySelector('.lh-film-card video');
      return video && !video.paused && video.currentTime > .1 && video.currentSrc.includes('worlds-together');
    }, null, { timeout: 15000 });
    assert.equal(await filmPage.locator('.lh-film-open').count(), 0, 'selecting the next film keeps first-click playback usable');
    await filmPage.waitForFunction(() => [...document.querySelectorAll('#films img')].some(image => image.currentSrc.includes('everyday-companion.jpg') && image.complete && image.naturalWidth > 1));
    await playback.close();
    console.log(`PASS: ${entry} first-click play, next-film play, failed-side-poster isolation`);
  }
  if (process.env.LUMIQ_LOADING_PLAYBACK_ONLY === '1') { await browser.close(); process.exit(0); }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const results = [];
  for (const visit of ['fresh-context', 'same-context-reload']) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(4500);
    results.push(await page.evaluate(visit => {
      const assets = performance.getEntriesByType('resource').filter(resource => resource.name.includes('/assets/'));
      return { visit, canvasCount: document.querySelectorAll('.lh-glass-products canvas').length,
        assetRequestCount: assets.length, transferredAssetBytes: assets.reduce((sum, asset) => sum + asset.transferSize, 0),
        requests: assets.map(asset => ({ url: asset.name, transferSize: asset.transferSize })),
        navigation: performance.getEntriesByType('navigation').map(nav => ({ domContentLoadedMs: nav.domContentLoadedEventEnd, loadMs: nav.loadEventEnd })) };
    }, visit));
  }
  await fs.writeFile('/tmp/lumiq-loading-measurements.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.map(result => ({ visit: result.visit, canvasCount: result.canvasCount, assetRequestCount: result.assetRequestCount, transferredAssetBytes: result.transferredAssetBytes, navigation: result.navigation })), null, 2));
  await context.close();

  const slow = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const slowPage = await slow.newPage();
  const blocked = [];
  await slowPage.route('**/assets/**/*.mp4', async route => {
    await new Promise(resolve => blocked.push(resolve));
    await route.continue().catch(() => {});
  });
  await slowPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await slowPage.waitForFunction(() => document.querySelector('#products')?.dataset.enhanced === 'true');
  await slowPage.waitForTimeout(800);
  assert.equal(await slowPage.locator('.lh-home').getAttribute('data-home-state'), 'open');
  assert.equal(await slowPage.locator('.lh-video-layer').getAttribute('data-ready'), null, 'a stalled film must keep the approved poster until a decoded frame exists');
  assert.equal(await slowPage.locator('.lh-loader').count(), 0, 'slow media must not hold the entire page behind a loading gate');
  await slowPage.screenshot({ path: '/tmp/lumiq-loading-slow-opening.png' });
  await slowPage.locator('#family').scrollIntoViewIfNeeded();
  await slowPage.waitForFunction(() => [...document.querySelectorAll('#family img')].every(img => img.complete && img.naturalWidth > 1));
  await slowPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  assert.equal(await slowPage.locator('.site-nav').evaluate(nav => nav.inert), false);
  blocked.forEach(resolve => resolve());
  await slow.close();
  console.log('PASS: stalled MP4 retains opening poster; first view, navigation and fast family/back scroll stay available');

  const missing = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const missingPage = await missing.newPage();
  await missingPage.route('**/*room-full*', route => route.abort());
  await missingPage.route('**/assets/home-products-refined-20260907/tablet-pair.webp', route => route.abort());
  await missingPage.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await missingPage.locator('#products').scrollIntoViewIfNeeded();
  await missingPage.waitForTimeout(1800);
  assert.equal(await missingPage.locator('.lh-products-viewport').isVisible(), true, 'a missing 3D artwork must retain ordinary cards');
  await missingPage.locator('[data-products-next]').click();
  assert.equal(await missingPage.locator('#products').getAttribute('data-active-product'), '1');
  await missingPage.locator('#experiences').scrollIntoViewIfNeeded();
  await missingPage.waitForFunction(() => document.querySelector('.lh-room-background img')?.dataset.homeImageState === 'error');
  assert.equal(await missingPage.locator('.lh-room-background img').evaluate(img => img.currentSrc.startsWith('data:') && img.complete && img.naturalWidth > 0), true, 'failed artwork must settle on its inline preview');
  await missingPage.screenshot({ path: '/tmp/lumiq-loading-missing-artwork.png' });
  await missingPage.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  assert.equal(await missingPage.locator('.lh-home').getAttribute('data-home-state'), 'open');
  await missing.close();
  console.log('PASS: missing room/product artwork retains image previews and navigable product cards');
} finally { await browser.close(); }
