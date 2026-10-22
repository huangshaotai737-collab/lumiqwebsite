import {expect, test, type Page} from '@playwright/test';

test.use({contextOptions: {reducedMotion: 'reduce'}});

async function withoutWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      return type.startsWith('webgl') ? null : Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
}

async function expectCardContentFits(page: Page, desktopFallback = false) {
  const cards = await page.locator('#products .lh-product-slot').evaluateAll(slots => slots.map(slot => {
    const card = slot.querySelector<HTMLElement>('.lh-product')!;
    const art = card.querySelector<HTMLElement>('.lh-product-art')!;
    const title = card.querySelector<HTMLElement>('.lh-product-copy h3')!;
    const body = card.querySelector<HTMLElement>('.lh-product-copy p')!;
    const action = card.querySelector<HTMLElement>('.lh-product-bottom')!;
    const rect = (element: HTMLElement) => element.getBoundingClientRect();
    const box = rect(card), image = rect(art), heading = rect(title), copy = rect(body), link = rect(action);
    return {
      active: slot.getAttribute('data-active') === 'true',
      card: {left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height},
      image: {left: image.left, right: image.right, top: image.top, bottom: image.bottom},
      title: {left: heading.left, right: heading.right, top: heading.top, bottom: heading.bottom},
      body: {top: copy.top, bottom: copy.bottom, display: getComputedStyle(body).display},
      action: {left: link.left, right: link.right, top: link.top, bottom: link.bottom, align: getComputedStyle(action).textAlign},
      padding: parseFloat(getComputedStyle(card).paddingLeft),
    };
  }));
  expect(cards).toHaveLength(5);
  for (const item of cards) {
    expect(item.padding).toBeGreaterThanOrEqual(desktopFallback ? 14 : 22);
    expect(item.image.top).toBeGreaterThanOrEqual(item.card.top + 17);
    expect(item.image.bottom).toBeLessThanOrEqual(item.title.top + 1);
    expect(item.title.bottom).toBeLessThanOrEqual(item.action.top);
    if (item.body.display !== 'none') expect(item.body.bottom).toBeLessThanOrEqual(item.action.top);
    expect(item.action.bottom).toBeLessThanOrEqual(item.card.bottom - 18);
    expect(item.action.align).toBe('center');
    expect(Math.abs((item.image.left + item.image.right) / 2 - (item.title.left + item.title.right) / 2)).toBeLessThan(2);
    expect(Math.abs((item.title.left + item.title.right) / 2 - (item.action.left + item.action.right) / 2)).toBeLessThan(2);
    if (desktopFallback) {
      expect(item.card.left).toBeGreaterThanOrEqual(-1);
      expect(item.card.right).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    } else {
      expect(item.card.height).toBeGreaterThanOrEqual(455);
      expect(item.card.width).toBeGreaterThanOrEqual(Math.min(page.viewportSize()!.width * .84, 360) - 1);
    }
  }
}

test('phone and tablet cards keep artwork, copy and action centered in three languages', async ({page}) => {
  for (const locale of ['zh-hant', 'en', 'ja']) {
    for (const width of locale === 'zh-hant' ? [320, 390, 768, 1024] : [390, 820]) {
      await page.setViewportSize({width, height: 900});
      await page.goto(`/${locale}#products`, {waitUntil: 'domcontentloaded'});
      await page.locator('#products').scrollIntoViewIfNeeded();
      await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
      await expectCardContentFits(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    }
  }
});

test('desktop fallback gives all five products room before and without WebGL', async ({page}) => {
  await withoutWebGL(page);
  for (const width of [1200, 1440, 1832, 1920]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/zh-hant#products', {waitUntil: 'domcontentloaded'});
    await page.locator('#products').scrollIntoViewIfNeeded();
    await expect(page.locator('#products')).not.toHaveAttribute('data-glass-3d', '');
    await expectCardContentFits(page, true);
  }
});

test('projected desktop text appears at its final size and stays aligned through selection', async ({page, browserName}) => {
  test.setTimeout(180_000);
  await page.setViewportSize({width: 1832, height: 830});
  for (const locale of browserName === 'chromium' ? ['zh-hant', 'en', 'ja'] : ['zh-hant']) {
    await page.goto(`/${locale}#products`, {waitUntil: 'domcontentloaded'});
    await page.locator('#products').scrollIntoViewIfNeeded();
    await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout: 20000});
    const visible = page.locator('#products .lh-glass-products [data-card-copy]').first();
    await expect(visible.locator('..')).toHaveAttribute('data-projected', 'true');
    const read = () => page.evaluate(() => {
      const canvas = document.querySelector<HTMLElement>('.lh-glass-products canvas')!.getBoundingClientRect();
      const surface = document.querySelector<HTMLElement>('.lh-glass-products [data-active="true"][data-projected="true"]')!;
      const title = surface.querySelector<HTMLElement>('[data-card-title]')!.getBoundingClientRect();
      const action = surface.querySelector<HTMLElement>('[data-card-action]')!.getBoundingClientRect();
      const body = surface.querySelector<HTMLElement>('p')!.getBoundingClientRect();
      const box = surface.getBoundingClientRect();
      return {canvasTop: canvas.top, boxTop: box.top, boxBottom: box.bottom,
        titleHeight: title.height, titleCenter: title.left + title.width / 2,
        actionCenter: action.left + action.width / 2, bodyBottom: body.bottom, actionTop: action.top};
    });
    const initial = await read();
    await page.waitForTimeout(500);
    const settled = await read();
    expect(initial.titleHeight).toBeGreaterThan(24);
    expect(Math.abs(initial.titleHeight - settled.titleHeight)).toBeLessThan(2);
    expect(settled.boxTop).toBeGreaterThanOrEqual(settled.canvasTop + 5);
    expect(settled.bodyBottom).toBeLessThanOrEqual(settled.actionTop);
    expect(Math.abs(settled.titleCenter - settled.actionCenter)).toBeLessThan(2);
    await page.locator('[data-products-next]').click();
    await expect(page.locator('#products')).toHaveAttribute('data-active-product', '1');
    await page.waitForTimeout(350);
    const next = await read();
    expect(Math.abs(next.titleCenter - next.actionCenter)).toBeLessThan(2);
    expect(next.bodyBottom).toBeLessThanOrEqual(next.actionTop);
  }
});
