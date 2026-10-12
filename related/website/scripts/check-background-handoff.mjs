import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

// Restoring an opaque opening edge, eager flow source or a stale fast-skip frame
// must fail this browser regression; all samples come from the real composition.
const base = process.env.BASE_URL || 'http://127.0.0.1:4193';
const output = process.env.EVIDENCE_DIR || '/private/tmp/lumiq-background-evidence';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const pixelSeam = async (page, label) => {
  const box = await page.locator('.lh-opening-stage').boundingBox();
  const edge = Math.round(box.y + box.height);
  assert(edge > 100 && edge < 800, `${label}: crossing is visible`);
  const png = await page.screenshot({ path: `${output}/${label}-crossing.png` });
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  // Subtract the underlying frame's own ribbon gradients: a legitimate bright
  // ribbon can change color across four rows without being a chapter seam.
  await page.locator('.lh-home').evaluate(e => { e.style.visibility = 'hidden'; });
  const reference = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer();
  await page.locator('.lh-home').evaluate(e => { e.style.visibility = ''; });
  const jumps = [];
  for (const x of [10, 20, 30, info.width - 31, info.width - 21, info.width - 11]) {
    for (let c = 0; c < 3; c++) {
      const above = ((edge - 2) * info.width + x) * 3 + c;
      const below = ((edge + 2) * info.width + x) * 3 + c;
      jumps.push(Math.abs((data[above] - reference[above]) - (data[below] - reference[below])));
    }
  }
  const mean = jumps.reduce((a, b) => a + b, 0) / jumps.length;
  assert(mean < 5, `${label}: adjacent background rows jump ${mean.toFixed(2)} RGB levels`);
  return mean;
};
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}/zh-hant`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-background-video]', { state: 'attached' });
  await page.waitForTimeout(1200);
  assert.equal(await page.locator('[data-background-video]').getAttribute('src'), null, 'flow movie stays deferred at the opening');
  let start = await page.locator('[data-background-video]').evaluate(v => Number(v.dataset.scrollStart));
  await page.evaluate(y => scrollTo({ top: y - 450, behavior: 'instant' }), start);
  await page.waitForFunction(() => !!document.querySelector('[data-background-video]').getAttribute('src'));
  await page.waitForFunction(() => document.querySelector('[data-background-video]').dataset.ready === 'true');
  for (const [label, offset] of [['after-desktop', 450], ['after-desktop-reverse', 350]]) {
    await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), start + offset);
    await page.waitForTimeout(900);
    console.log(label, await pixelSeam(page, label));
  }
  await page.locator('#join').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-background-video]').currentTime > 25);
  assert.equal(await page.locator('.lumiq-root').getAttribute('data-flow-background'), 'true');
  await page.waitForTimeout(750); // Existing 650ms text entrance must settle before contrast evidence.
  const ink = await page.locator('.lh-join-copy h2').evaluate(e => getComputedStyle(e).color);
  assert.equal(ink, 'rgb(247, 248, 252)', 'later dark chapters retain light ink');
  await page.screenshot({ path: `${output}/after-desktop-dark.png` });
  await page.close();

  for (const [label, options] of [
    ['after-mobile', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ['after-reduced', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
  ]) {
    const page = await browser.newPage(options);
    await page.goto(`${base}/zh-hant`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-background-video]', { state: 'attached' });
    const end = await page.locator('.lh-opening-stage').evaluate(e => scrollY + e.getBoundingClientRect().bottom);
    await page.evaluate(y => scrollTo({ top: y - 420, behavior: 'instant' }), end);
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('[data-background-video]').getAttribute('src'), null, `${label}: no movie request`);
    console.log(label, await pixelSeam(page, label));
    await page.evaluate(y => scrollTo({ top: y - 500, behavior: 'instant' }), end);
    await page.waitForTimeout(250);
    console.log(`${label}-reverse`, await pixelSeam(page, `${label}-reverse`));
    await page.close();
  }

  const fast = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await fast.route('**/flow-30s-scrub.mp4', async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue(); });
  await fast.goto(`${base}/zh-hant`, { waitUntil: 'domcontentloaded' });
  await fast.waitForSelector('[data-background-video]', { state: 'attached' });
  await fast.locator('#family').scrollIntoViewIfNeeded();
  // currentTime updates before decoding finishes; keep the loading still visible
  // until the late chapter frame has actually become drawable.
  assert.equal(await fast.locator('[data-background-fallback]').evaluate(e => e.style.opacity), '1');
  await fast.waitForFunction(() => {
    const v = document.querySelector('[data-background-video]');
    return v.currentTime > 20 && !v.seeking && v.dataset.ready === 'true';
  }, undefined, { timeout: 30000 });
  assert.equal(await fast.locator('[data-background-video]').getAttribute('data-ready'), 'true');
  await fast.screenshot({ path: `${output}/after-slow-fast-skip.png` });
  await fast.close();

  const failed = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await failed.route('**/flow-30s-scrub.mp4', route => route.abort());
  await failed.goto(`${base}/zh-hant`, { waitUntil: 'domcontentloaded' });
  await failed.waitForSelector('[data-background-video]', { state: 'attached' });
  const failedStart = await failed.locator('[data-background-video]').evaluate(v => Number(v.dataset.scrollStart));
  await failed.evaluate(y => scrollTo({ top: y + 450, behavior: 'instant' }), failedStart);
  await failed.waitForFunction(() => !!document.querySelector('[data-background-video]').error);
  assert.equal(await failed.locator('[data-background-fallback]').evaluate(e => e.style.opacity), '1');
  console.log('after-failed-media', await pixelSeam(failed, 'after-failed-media'));
  await failed.close();
  console.log('PASS: deferred source, forward/reverse pixel seams, mobile/reduced static handoff, preserved darkening/light ink, slow-media fast skip');
} finally { await browser.close(); }
