import {expect, test} from '@playwright/test';

test('every member panel fits phones and local demo settings and drafts persist', async ({page}) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const locale of ['zh-hant', 'en', 'ja']) {
    await page.setViewportSize({width: 320, height: 844});
    await page.goto(`/${locale}/members`, {waitUntil: 'domcontentloaded'});
    await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
    // The preview is shared across languages in the same browser.
    if (await page.locator('.members-empty button').count()) await page.locator('.members-empty button').click();
    await expect(page.locator('.members-device')).toHaveCount(2);
    await page.locator('.members-device button').first().click();
    const name = page.locator('.members-panel input[maxlength="40"]');
    await name.fill('Phone walkthrough device');
    await page.locator('.members-panel input[type="checkbox"]').check();
    await page.locator('.members-panel button[type="submit"]').click();
    await expect(page.locator('.members-device-copy h3').first()).toHaveText('Phone walkthrough device');
    for (const width of [320, 390]) {
      await page.setViewportSize({width, height: 844});
      for (let index = 0; index < 5; index++) {
        const tab = page.locator('.members-sidebar button').nth(index);
        await tab.click();
        await expect(tab).toHaveAttribute('aria-pressed', 'true');
        await expect(page.locator('.members-content')).toBeVisible();
        const outside = await page.locator('.members-content').evaluate(e => {
          const nodes = [...e.querySelectorAll('input,select,textarea,button,label,h2,h3,p,small')];
          return nodes.filter(node => {
            const r = node.getBoundingClientRect();
            return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
          }).map(node => node.className || node.tagName);
        });
        expect(outside).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      }
    }
    await page.locator('.members-sidebar button').nth(2).click();
    await page.locator('.members-panel input[maxlength="80"]').fill('Local phone draft');
    await page.locator('.members-panel button[type="submit"]').click();
    await page.locator('.members-sidebar button').nth(3).click();
    await page.locator('.members-panel select').selectOption('complaint');
    await page.locator('.members-panel textarea').fill('Local layout walkthrough only.');
    await page.locator('.members-panel button[type="submit"]').click();
    await page.reload({waitUntil: 'domcontentloaded'});
    await page.locator('.members-sidebar button').nth(3).click();
    await expect(page.locator('.members-panel select')).toHaveValue('complaint');
    await expect(page.locator('.members-panel textarea')).toHaveValue('Local layout walkthrough only.');
    await page.locator('.members-sidebar button').nth(2).click();
    await expect(page.locator('.members-panel input[maxlength="80"]')).toHaveValue('Local phone draft');
  }
  expect(errors).toEqual([]);
});
