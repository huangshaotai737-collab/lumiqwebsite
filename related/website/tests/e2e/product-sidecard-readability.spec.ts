import {test, expect} from '@playwright/test';

for (const locale of ['zh-hant','en','ja']) for (const viewport of [{width:1440,height:1000},{width:2560,height:640},{width:3840,height:960}]) {
  test(`five product cards keep readable side labels in ${locale} at ${viewport.width}×${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto(`/${locale}#products`, {waitUntil:'domcontentloaded'});
    await page.locator('.lh-products-stage').evaluate(element => scrollTo({top:scrollY + element.getBoundingClientRect().top,behavior:'instant'}));
    const cards = page.locator('.lh-glass-products [data-projected="true"]');
    await expect(cards).toHaveCount(5);
    await page.evaluate(() => document.fonts.ready);
    for (let selected = 0; selected < 5; selected++) {
      await expect(page.locator('#products')).toHaveAttribute('data-active-product', String(selected));
      await expect.poll(async () => cards.evaluateAll(elements => {
        const side = elements.filter(element => element.getAttribute('data-active') !== 'true');
        return side.length === 4 && side.every(element => {
          const matrix = new DOMMatrix(getComputedStyle(element).transform);
          const scale = Math.hypot(matrix.c, matrix.d);
          return [['[data-card-title]',20],['[data-card-action]',18]].every(([selector, minimum]) => {
            const label = element.querySelector(selector as string) as HTMLElement;
            const style = getComputedStyle(label);
            return parseFloat(style.fontSize) * scale >= Number(minimum)
              && label.scrollWidth <= label.clientWidth + 1;
          });
        });
      })).toBe(true);
      // The active and side labels must retain a separate, usable hit target.
      await expect(page.locator('.lh-glass-products [data-active="true"] .glass-product-hit')).toHaveAttribute('href', /\/products\//);
      if (selected < 4) await page.locator('[data-products-next]').click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

test('the non-WebGL fallback keeps readable side-card labels', async ({page}) => {
  await page.setViewportSize({width:2560,height:640});
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.includes('webgl')) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto('/en#products', {waitUntil:'domcontentloaded'});
  await page.locator('.lh-products-stage').evaluate(element => scrollTo({top:scrollY + element.getBoundingClientRect().top,behavior:'instant'}));
  const cards = page.locator('.lh-product-slot');
  await expect(cards).toHaveCount(5);
  await expect(page.locator('.lh-product-slot[data-active="false"]')).toHaveCount(4);
  for (const card of await page.locator('.lh-product-slot[data-active="false"]').all()) {
    expect(await card.locator('h3').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(20);
    expect(await card.locator('.lh-product-bottom').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(18);
    expect(await card.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
  }
});
