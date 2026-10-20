import {expect, test} from '@playwright/test';

test('reduced-motion desktop opening keeps its artwork and readable companion cards', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const locale of ['zh-hant', 'en', 'ja']) {
    for (const width of [1440, 1710]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(`/${locale}`, {waitUntil: 'domcontentloaded'});
      await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true');
      const widths = await page.locator('.lh-rhythm-card').evaluateAll(items => items.map(e => e.getBoundingClientRect().width));
      expect(widths.every(w => w >= 150)).toBe(true);
      await expect(page.locator('.lh-mobile-hero-art')).toBeVisible();
      await expect(page.locator('.lh-mobile-ola-art')).toBeVisible();
      for (const selector of ['.lh-hero','.lh-ola']) {
        await expect(page.locator(selector)).toHaveCSS('background-image','none');
      }
      const fits = await page.locator('.lh-rhythm-card').evaluateAll(items => items.map(e => {
        const box = e.getBoundingClientRect();
        return [...e.querySelectorAll('h3,p')].every(copy => {
          const range = document.createRange();range.selectNodeContents(copy);
          return [...range.getClientRects()].every(r => r.left >= box.left && r.right <= box.right + 1);
        });
      }));
      expect(fits.every(Boolean)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  }
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-static-opening', 'true');
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-video-mode', 'true');
});
