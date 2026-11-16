import {expect, test, type Page} from '@playwright/test';

async function settledHome(page: Page) {
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
  await page.evaluate(() => document.fonts.ready);
  // Observe beyond the pin/font refresh batch; an initial correct frame alone
  // must not hide the late restoration that caused this regression.
  await page.waitForTimeout(1200);
}

for (const section of ['#products', '#films']) {
  test(`reload preserves ${section} instead of restoring a pre-pin chapter`, async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await settledHome(page);
    await page.locator(section).evaluate(element => {
      scrollTo({top: scrollY + element.getBoundingClientRect().top - 100, behavior: 'instant'});
    });
    await page.waitForTimeout(500);
    const before = await page.locator(section).evaluate(e => e.getBoundingClientRect().top);
    for (let i = 0; i < 3; i++) {
      await page.reload({waitUntil: 'domcontentloaded'});
      await settledHome(page);
      expect(Math.abs(await page.locator(section).evaluate(e => e.getBoundingClientRect().top) - before)).toBeLessThan(12);
      await expect(page.locator('.lh-opening-stage').locator('..')).toHaveClass(/pin-spacer/);
      await expect(page.locator('.pin-spacer')).toHaveCount(1);
    }
    const beforeWheel = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 160);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeWheel + 50);
  });
}

test('home navigation resets to the opening after repeated visits to deep product content', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
  await settledHome(page);
  for (const distance of [0, 1800, 4000]) {
    await page.locator('#films').evaluate(e => scrollTo({top: scrollY + e.getBoundingClientRect().top, behavior: 'instant'}));
    await page.waitForTimeout(400);
    await page.locator('.site-desktop-nav a[href="/zh-hant/products"]').click();
    await page.waitForURL('**/zh-hant/products');
    await page.evaluate(y => scrollTo({top: y, behavior: 'instant'}), distance);
    await page.locator('.site-desktop-nav a[href="/zh-hant"]').click();
    await page.waitForURL('**/zh-hant');
    await settledHome(page);
    expect(await page.evaluate(() => scrollY)).toBeLessThan(2);
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '0');
    await expect(page.locator('.lh-rhythm-cards')).toHaveCSS('opacity', '0');
    await expect(page.locator('.pin-spacer')).toHaveCount(1);
    await expect(page.locator('#films')).not.toHaveAttribute('inert');
    // Returning to frame zero must not leave the next chapter visible, nor
    // prevent that chapter from appearing again when the reader scrolls.
    await page.evaluate(() => scrollTo({top: 2300, behavior: 'instant'}));
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '0');
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  }
});

test('browser Back keeps the reading position and film controls respond', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
  await settledHome(page);
  await page.locator('#films').evaluate(e => scrollTo({top: scrollY + e.getBoundingClientRect().top - 86, behavior: 'instant'}));
  await page.waitForTimeout(500);
  const before = await page.locator('#films').evaluate(e => e.getBoundingClientRect().top);
  await page.locator('.site-desktop-nav a[href="/zh-hant/products"]').click();
  await page.waitForURL('**/zh-hant/products');
  await page.goBack({waitUntil: 'domcontentloaded'});
  await settledHome(page);
  expect(Math.abs(await page.locator('#films').evaluate(e => e.getBoundingClientRect().top) - before)).toBeLessThan(12);
  await page.locator('.lh-films-controls button').last().click();
  await expect(page.locator('.lh-films-controls strong')).toHaveText('02');
});

test('vertical wheel input crosses the film composition without being caught or held', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
  await settledHome(page);
  await page.locator('.lh-films-stage').evaluate(element => {
    const navBottom = document.querySelector('.site-nav')!.getBoundingClientRect().bottom;
    scrollTo({top: scrollY + element.getBoundingClientRect().top - navBottom - 32, behavior: 'instant'});
  });
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 160);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 120);
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 210);
});
