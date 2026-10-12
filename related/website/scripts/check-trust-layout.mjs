import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [390, 1440, 1920]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:4211'}/en`);
    await page.waitForSelector('.lh-home[data-home-state="open"]', { timeout: 60000 });
    await page.locator('#safety').scrollIntoViewIfNeeded();
    const before = await page.locator('.lh-safety-photo').boundingBox();
    const copy = await page.locator('.lh-safety-copy').boundingBox();
    const notes = await page.locator('.lh-trust-notes').boundingBox();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
    if (width > 1100) {
      assert(Math.abs(before.width / width - .48) < .002, 'desktop care photo is 20% narrower than its original 60vw frame');
      assert(before.x > 0 && before.x + before.width < copy.x, 'photo inset left; text separated on right');
      assert(Math.abs(copy.x - notes.x) < 1, 'all text shares right column');
      assert(copy.y + copy.height <= notes.y + 1, 'heading and principles do not overlap');
      assert.notEqual(await page.locator('.lh-safety-photo').evaluate(el => getComputedStyle(el).maskImage), 'none', 'top/bottom fade retained');
      await page.evaluate(() => window.scrollBy(0, 250));
      await page.waitForTimeout(600);
      const after = await page.locator('.lh-safety-photo').boundingBox();
      assert(Math.abs(after.width - before.width) < 1 && Math.abs(after.x - before.x) < 1, 'scroll does not restore old centered/shrunken frame');
    } else {
      assert(copy.y + copy.height <= before.y + 1 && notes.y >= before.y + before.height - 1, 'mobile copy, photo and notes remain stacked without overlap');
    }
    console.log(`${width}: trust layout passed`);
    await page.close();
  }
} finally { await browser.close(); }
