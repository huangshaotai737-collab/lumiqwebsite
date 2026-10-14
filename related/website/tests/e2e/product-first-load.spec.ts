import {expect, test, type Page} from '@playwright/test';

async function open(page: Page, slug: string, locale = 'zh-hant') {
  await page.goto(`/${locale}/products/${slug}`, {waitUntil: 'domcontentloaded'});
  await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
}

async function artworkReady(page: Page) {
  await expect.poll(() => page.locator('.pd-hero-visual img').evaluate((image: HTMLImageElement) =>
    image.complete && image.naturalWidth > 0 && Boolean(image.currentSrc)), {timeout: 6000}).toBe(true);
}

test('Orb appears on first entry even when the image transformation service stalls', async ({browser}) => {
  const context = await browser.newContext({viewport: {width: 1710, height: 900}, deviceScaleFactor: 2});
  try {
    const page = await context.newPage();
    await page.route('**/_next/image?*', async route => {
      if (route.request().url().includes('nest15-')) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        await route.abort().catch(() => {});
      } else await route.continue();
    });
    await open(page, 'nest');
    await artworkReady(page);
    for (const swatch of await page.locator('.pd-finish-picker button').all()) {
      await swatch.click();
      await artworkReady(page);
    }
  } finally { await context.close(); }
});

test('a late product font renders without needing a resize to correct its metrics', async ({page}) => {
  await page.setViewportSize({width: 1710, height: 900});
  await page.route('**/barlow-condensed-semibold.ttf', async route => {
    await new Promise(resolve => setTimeout(resolve, 1200));
    await route.continue();
  });
  await open(page, 'ola-go');
  await page.evaluate(() => document.fonts.ready);
  const width = () => page.locator('.pd-hero-display-title').evaluate(e => {
    const range = document.createRange(); range.selectNodeContents(e);
    return range.getBoundingClientRect().width;
  });
  const initial = await width();
  await page.setViewportSize({width: 600, height: 900});
  await page.setViewportSize({width: 1710, height: 900});
  expect(Math.abs(initial - await width())).toBeLessThan(2);
});

test('product names stay clear of artwork and reading copy when the custom font is unavailable', async ({page}) => {
  await page.route('**/barlow-condensed-semibold.ttf', route => route.abort());
  for (const width of [981, 1440, 1710]) {
    await page.setViewportSize({width, height: 900});
    await open(page, 'ola-go');
    const fits = await page.locator('.pd-hero-grid').evaluate(e => {
      const name = e.querySelector('.pd-hero-display-title')!;
      const range = document.createRange(); range.selectNodeContents(name);
      const art = e.querySelector('.pd-hero-visual')!.getBoundingClientRect();
      const tagline = e.querySelector('.pd-product-tagline')!.getBoundingClientRect();
      return [...range.getClientRects()].every(r => r.right <= art.left + 1 && r.bottom <= tagline.top + 1);
    });
    expect(fits).toBe(true);
  }
});

for (const density of [1, 2]) {
  test(`all five product heroes survive entry, refresh and desktop–phone resize at DPR ${density}`, async ({browser}) => {
    test.setTimeout(120000);
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, deviceScaleFactor: density});
    try {
      const page = await context.newPage();
      for (const slug of ['ola', 'ola-go', 'tablet', 'print', 'nest']) {
        await page.setViewportSize({width: 1440, height: 900});
        await open(page, slug);
        await artworkReady(page);
        await page.reload({waitUntil: 'domcontentloaded'});
        await artworkReady(page);
        for (const width of [390, 980, 981, 1440]) {
          await page.setViewportSize({width, height: 900});
          await artworkReady(page);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        }
      }
    } finally { await context.close(); }
  });
}

test('waitlist entries use the same label on products, plans, forms and the cart', async ({page}) => {
  test.setTimeout(90000);
  for (const [locale, label] of [['zh-hant', '加入候補名單'], ['en', 'Join the waitlist'], ['ja', 'ウェイトリストに登録']]) {
    await page.setViewportSize({width: 1440, height: 900});
    for (const slug of ['ola', 'ola-go', 'tablet', 'print', 'nest']) {
      await open(page, slug, locale);
      for (const entry of await page.locator('.pd-primary-action').all()) await expect(entry).toHaveText(label);
    }
    await page.locator('[data-cart-add="nest"]').first().click();
    await expect(page.locator('#lumiq-cart .cart-primary')).toHaveText(label);
    await page.keyboard.press('Escape');
    await page.goto(`/${locale}/plans`, {waitUntil: 'domcontentloaded'});
    for (const entry of await page.locator('main a[href$="/prelaunch"]').all()) await expect(entry).toHaveText(label);
    await page.goto(`/${locale}/prelaunch`, {waitUntil: 'domcontentloaded'});
    await expect(page.locator('button[type="submit"]')).toHaveText(label);
  }
  for (const width of [320, 390, 767]) {
    await page.setViewportSize({width, height: 844});
    await open(page, 'nest');
    await expect(page.locator('.site-login-btn')).toHaveAccessibleName('加入候補名單');
    expect((await page.locator('.site-login-btn').innerText()).trim()).toBe('加入候補名單');
  }
});
