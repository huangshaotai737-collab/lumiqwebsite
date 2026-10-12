import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const output = new URL('../../../../outputs/lumiq-safety-art-20261002/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const [width, height] of [[1440, 1000], [1920, 1080], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto('http://127.0.0.1:4211/en', { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.waitForSelector('.lh-home[data-home-state="open"]', { timeout: 60000 });
    await page.locator('#safety').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.querySelector('#safety').getBoundingClientRect().top + scrollY - 90));
    const image = page.locator('.lh-safety-photo img');
    await image.waitFor();
    await page.waitForFunction(() => {
      const image = document.querySelector('.lh-safety-photo img');
      return image?.complete && image.naturalWidth > 0;
    });
    await page.waitForTimeout(800);
    const details = await image.evaluate(image => ({
      source: image.getAttribute('src'), imageWidth: image.naturalWidth, imageHeight: image.naturalHeight,
      fit: getComputedStyle(image).objectFit,
    }));
    assert.match(details.source, /story-world-family/);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await page.locator('[data-nextjs-dialog], .vite-error-overlay').count(), 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: new URL(`after-${width}.png`, output).pathname });
    // Evidence of the prior image in the same unchanged layout; no source rollback.
    await image.evaluate(image => {
      image.removeAttribute('srcset');
      image.classList.remove('lh-safety-story-world');
      image.src = '/assets/western-scenes-20260908/trust-wide.webp';
    });
    await page.waitForFunction(() => document.querySelector('.lh-safety-photo img').complete);
    await page.screenshot({ path: new URL(`before-${width}.png`, output).pathname });
    results.push({ width, height, ...details, errors });
    await page.close();
  }
  await writeFile(new URL('verification.json', output), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
