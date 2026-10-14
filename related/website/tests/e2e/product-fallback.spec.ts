import {expect, test, type Page} from '@playwright/test';

async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {value: function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      return type.startsWith('webgl') ? null : Reflect.apply(original, this, [type, ...args]);
    }});
  });
}

async function openProducts(page: Page, locale = 'zh-hant') {
  await page.goto(`/${locale}#products`, {waitUntil: 'domcontentloaded'});
  await page.locator('#products').scrollIntoViewIfNeeded();
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
}

async function expectFiveCards(page: Page) {
  const layout = await page.locator('.lh-product-slot').evaluateAll(cards => cards.map(e => {
    const r = e.getBoundingClientRect();
    return {opacity: Number(getComputedStyle(e).opacity), width: r.width, left: r.left, right: r.right, inert: (e as HTMLElement).inert};
  }));
  expect(layout).toHaveLength(5);
  expect(layout.filter(c => c.opacity > .5)).toHaveLength(5);
  const width = page.viewportSize()!.width;
  for (const card of layout) {
    expect(card.left).toBeGreaterThanOrEqual(0);
    expect(card.right).toBeLessThanOrEqual(width);
    expect(card.width).toBeLessThan(width * .25);
    expect(card.inert).toBe(false);
  }
}

test('unavailable WebGL keeps all five desktop products visible at the intended size', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await disableWebGL(page);
  for (const width of [1200, 1440, 1710, 1920]) {
    await page.setViewportSize({width, height: 900});
    await openProducts(page);
    await expect(page.locator('#products')).not.toHaveAttribute('data-glass-3d', '');
    await expectFiveCards(page);
  }
});

test('the desktop fallback keeps five cards before JavaScript has loaded', async ({browser}) => {
  const context = await browser.newContext({javaScriptEnabled: false, viewport: {width: 1710, height: 900}, reducedMotion: 'reduce'});
  try {
    const page = await context.newPage();
    await page.goto(`${test.info().project.use.baseURL}/zh-hant#products`, {waitUntil: 'domcontentloaded'});
    await page.locator('#products').scrollIntoViewIfNeeded();
    await expectFiveCards(page);
    await expect(page.locator('.lh-products-viewport a')).toHaveCount(5);
  } finally {await context.close();}
});

test('all five fallback products can be selected and the selected product link opens its page', async ({page}) => {
  await page.setViewportSize({width: 1710, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await disableWebGL(page);
  await openProducts(page);
  const products = page.locator('#products');
  for (let i = 0; i < 5; i++) {
    await page.locator('[data-products-next]').click();
    await expect(products).toHaveAttribute('data-active-product', String((i + 1) % 5));
    await expectFiveCards(page);
  }
  const outer = page.locator('.lh-product-slot[data-offset="2"] a');
  const href = await outer.getAttribute('href');
  await outer.click();
  await expect(products).toHaveAttribute('data-active-product', '2');
  await page.locator('.lh-product-slot[data-active="true"] a').click();
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('phone and desktop resizing preserves the selected product and restores five fallback cards', async ({page}) => {
  await page.setViewportSize({width: 1710, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await disableWebGL(page);
  await openProducts(page);
  await page.locator('[data-products-next]').click();
  await page.locator('[data-products-next]').click();
  for (let i = 0; i < 3; i++) {
    await page.setViewportSize({width: 390, height: 844});
    await expect(page.locator('#products')).toHaveAttribute('data-carousel', 'false');
    await expect(page.locator('.lh-products-controls')).toContainText('03 / 05');
    await page.setViewportSize({width: 1710, height: 900});
    await expect(page.locator('#products')).toHaveAttribute('data-carousel', 'true');
    await expect(page.locator('#products')).toHaveAttribute('data-active-product', '2');
    await expectFiveCards(page);
  }
});

test('missing 3D artwork leaves five usable fallback products instead of enlarging three', async ({page}) => {
  await page.setViewportSize({width: 1710, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.route('**/assets/home-products-refined-20260907/tablet-pair.webp', route => route.abort());
  await openProducts(page);
  await expect(page.locator('.lh-products-viewport')).toBeVisible();
  await page.waitForTimeout(500);
  await expect(page.locator('#products')).not.toHaveAttribute('data-glass-3d', '');
  await expectFiveCards(page);
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product', '1');
  await expectFiveCards(page);
});

test('losing an active WebGL context restores five normally sized products', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'The CI WebKit renderer may not provide a WebGL context.');
  await page.setViewportSize({width: 1710, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await openProducts(page);
  await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout: 20000});
  await page.locator('.lh-glass-products canvas').evaluate(e => {
    const context = (e as HTMLCanvasElement).getContext('webgl2')!;
    context.getExtension('WEBGL_lose_context')!.loseContext();
  });
  await expect(page.locator('#products')).not.toHaveAttribute('data-glass-3d', '');
  await expectFiveCards(page);
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product', '1');
  await expectFiveCards(page);
});

test('normal 3D rendering still shows five products after repeated phone resizing', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'The CI WebKit renderer may not provide a WebGL context.');
  await page.setViewportSize({width: 1710, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await openProducts(page);
  await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout: 20000});
  await page.locator('[data-products-next]').click();
  for (let i = 0; i < 2; i++) {
    await page.setViewportSize({width: 390, height: 844});
    await expect(page.locator('.lh-products-controls')).toContainText('02 / 05');
    await page.setViewportSize({width: 1710, height: 900});
    await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout: 20000});
    await expect(page.locator('.lh-glass-products canvas')).toHaveCount(1);
    await expect(page.locator('.lh-glass-products [data-card-copy]')).toHaveCount(5);
    for (const card of await page.locator('.lh-glass-products [data-card-copy]').all()) await expect(card).toBeInViewport();
    await expect(page.locator('#products')).toHaveAttribute('data-active-product', '1');
  }
});
