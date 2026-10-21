import {expect, test} from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test.describe(reducedMotion, () => {
    test.use({contextOptions: {reducedMotion}});
    for (const locale of ['en', 'zh-hant', 'ja']) {
      test(`${locale} streamed pages remain readable through early viewport changes`, async ({page}) => {
        const errors: string[] = [];
        page.on('pageerror', error => errors.push(error.message));
        for (let repeat = 0; repeat < 2; repeat++) {
          for (const route of ['', '/products', '/products/tablet']) {
            const response = await page.goto(`/${locale}${route}`);
            expect(response?.status()).toBe(200);
            expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(reducedMotion === 'reduce');
            // The real page must be server-rendered, rather than hidden behind
            // a client-only mount as a way of avoiding hydration errors.
            expect(await response!.text()).toMatch(/<main[\s>]/);
            for (const width of [390, 1440]) {
              await page.setViewportSize({width, height: 1000});
              await page.waitForTimeout(200);
            }
            await expect(page.locator('main').first()).toBeVisible();
            await expect(page.locator('main:visible')).toHaveCount(1);
            await expect(page.locator('main h1').first()).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
          }
        }
        expect(errors).toEqual([]);
      });
    }
  });
}
