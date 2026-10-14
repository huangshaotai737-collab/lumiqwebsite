import {expect, test, type Page} from '@playwright/test';

async function ready(page: Page, route: string) {
  await page.goto(route, {waitUntil: 'domcontentloaded'});
  await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
}

test('phone products use the same bottom arrows and page count as the film rail', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant');
  const products = page.locator('#products');
  await products.scrollIntoViewIfNeeded();
  await expect(products).toHaveAttribute('data-enhanced', 'true');
  const rail = (await page.locator('.lh-products-viewport').boundingBox())!;
  const controls = page.locator('.lh-products-controls');
  const box = (await controls.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(rail.y + rail.height - 1);
  await expect(controls).toContainText('01 / 05');
  for (let step = 1; step <= 5; step++) {
    await page.locator('[data-products-next]').click();
    await expect(controls).toContainText(`${String(step % 5 + 1).padStart(2, '0')} / 05`);
  }
});

test('unchanged phone scroll selection does not repeatedly repaint all product cards', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant');
  await page.locator('#products').scrollIntoViewIfNeeded();
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
  await page.waitForTimeout(150);
  const mutations = await page.evaluate(async () => {
    let count = 0;
    const observer = new MutationObserver(records => count += records.length);
    observer.observe(document.querySelector('.lh-products-track')!, {subtree: true, attributes: true, attributeFilter: ['data-active', 'data-offset']});
    for (let i = 0; i < 20; i++) document.querySelector('.lh-products-viewport')!.dispatchEvent(new Event('scroll'));
    await new Promise(resolve => setTimeout(resolve, 100));
    observer.disconnect();
    return count;
  });
  expect(mutations).toBeLessThanOrEqual(10);
});

test('native product swipes change products while vertical gestures still scroll the phone page', async ({browser, browserName}) => {
  test.skip(browserName !== 'chromium', 'Native touch injection requires Chromium.');
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  try {
    const page = await context.newPage();
    await ready(page, `${test.info().project.use.baseURL}/zh-hant`);
    const products = page.locator('#products');
    await expect(products).toHaveAttribute('data-enhanced', 'true');
    await page.locator('.lh-products-viewport').evaluate(e => window.scrollTo({top: scrollY + e.getBoundingClientRect().top - 140, behavior: 'instant'}));
    const cdp = await context.newCDPSession(page);
    const swipe = async (x1: number, y1: number, x2: number, y2: number) => {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x1, y: y1}]});
      for (let i = 1; i <= 18; i++) {
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x1 + (x2 - x1) * i / 18, y: y1 + (y2 - y1) * i / 18}]});
        await page.waitForTimeout(25);
      }
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    };
    await swipe(310, 310, 70, 310);
    await expect(products).not.toHaveAttribute('data-active-product', '0');
    await page.waitForTimeout(500);
    const selected = await products.getAttribute('data-active-product');
    const before = await page.evaluate(() => scrollY);
    await swipe(190, 470, 190, 230);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
    await expect(products).toHaveAttribute('data-active-product', selected!);
  } finally { await context.close(); }
});

test('major phone chapter headings match the opening headline and inner-page text has stronger contrast', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant');
  const sizes = await page.evaluate(() => {
    const size = (s: string) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
    return {hero: size('#hero-title'), sections: ['#ola-title', '#films-title', '.lh-room-heading h2', '.lh-safety-copy h2', '.lh-family-heading h2', '.lh-join-copy h2'].map(size)};
  });
  expect(sizes.sections.every(size => Math.abs(size - sizes.hero) < 1)).toBe(true);
  await ready(page, '/zh-hant/products');
  const text = await page.locator('.prod-hero-text p').evaluate(e => ({size: parseFloat(getComputedStyle(e).fontSize), colour: getComputedStyle(e).color}));
  expect(text.size).toBeGreaterThanOrEqual(17);
  const channels = text.colour.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
    const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  const luminance = .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
  expect(1.05 / (luminance + .05)).toBeGreaterThanOrEqual(7);
});

test('phone logos are larger and the compact footer keeps its navigation and brand description', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant/faq');
  expect((await page.locator('.nav-logo').boundingBox())!.width).toBeGreaterThanOrEqual(130);
  const footer = page.locator('.footer');
  await footer.scrollIntoViewIfNeeded();
  expect((await footer.locator('.foot-logo-img').first().boundingBox())!.height).toBeGreaterThanOrEqual(36);
  expect((await footer.boundingBox())!.height).toBeLessThanOrEqual(300);
  const groups = footer.locator('.foot-mobile-nav details');
  await expect(groups).toHaveCount(4);
  await groups.first().locator('summary').click();
  await expect(groups.first().locator('a')).toHaveCount(6);
  await groups.nth(2).locator('summary').click();
  await expect(groups.nth(2).locator('a')).toHaveCount(4);
  await footer.locator('.foot-brand-details summary').click();
  await expect(footer.locator('.foot-brand-details p')).toBeVisible();
});

test('phone prices, waitlist and cart actions form a compact row with safe wrapping', async ({page}) => {
  for (const width of [390, 500, 640]) {
    await page.setViewportSize({width, height: 900});
    for (const slug of ['ola', 'tablet', 'print']) {
      await ready(page, `/zh-hant/products/${slug}`);
      for (const scope of ['.pd-hero-copy', '.pd-final-actions']) {
        const join = (await page.locator(`${scope} .pd-primary-action`).boundingBox())!;
        const cart = (await page.locator(`${scope} .cart-add-button`).boundingBox())!;
        expect(Math.abs(join.y + join.height / 2 - cart.y - cart.height / 2)).toBeLessThan(2);
      }
    }
  }
  for (const locale of ['zh-hant', 'en', 'ja']) {
    await page.setViewportSize({width: 320, height: 740});
    await ready(page, `/${locale}/products/ola`);
    for (const button of await page.locator('.pd-hero-copy .pd-primary-action, .pd-hero-copy .cart-add-button').all()) {
      const r = (await button.boundingBox())!;
      expect(r.x).toBeGreaterThan(0);
      expect(r.x + r.width).toBeLessThan(320);
    }
    await page.locator('[data-cart-add="ola"]').first().click();
    await expect(page.locator('#lumiq-cart')).toBeVisible();
    await page.keyboard.press('Escape');
  }
});
