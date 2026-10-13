import {expect, test} from '@playwright/test';

test.use({channel: 'chrome'});
test.setTimeout(120_000);

for (const locale of ['zh-hant', 'en', 'ja']) {
  test(`${locale}: intermediate windows keep a compact, proportional opening`, async ({page}) => {
    await page.setViewportSize({width: 1710, height: 900});
    await page.goto(`/${locale}`);
    await page.waitForFunction(() => document.querySelector('#products')?.getAttribute('data-enhanced') === 'true');
    let previous: {width: number; font: number} | undefined;
    for (const width of [1440, 1200, 1199, 1101, 1100, 931, 820, 768, 767, 390, 767, 768, 931, 1199, 1200, 1710]) {
      await page.setViewportSize({width, height: 900});
      await page.evaluate(() => window.scrollTo({top: 0, behavior: 'instant'}));
      await page.waitForTimeout(350);
      const state = await page.evaluate(() => {
        const rect = (e: Element) => {const r=e.getBoundingClientRect();return {x:r.x,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        const hero=document.querySelector('.lh-hero')!, copy=hero.querySelector('.lh-hero-copy')!, art=hero.querySelector('.lh-mobile-hero-art')!;
        return {width:innerWidth,font:parseFloat(getComputedStyle(document.querySelector('#hero-title')!).fontSize),hero:rect(hero),copy:rect(copy),art:rect(art),nav:rect(document.querySelector('.site-nav')!),actions:rect(hero.querySelector('.lh-actions')!),video:document.querySelector('.lh-opening')!.hasAttribute('data-video-mode'),fit:getComputedStyle(art.querySelector('img')!).objectFit,overflow:document.documentElement.scrollWidth-innerWidth};
      });
      expect(state.overflow).toBeLessThanOrEqual(1);
      expect(state.copy.top).toBeGreaterThanOrEqual(state.nav.bottom + 8);
      expect(state.actions.bottom).toBeLessThanOrEqual(state.hero.bottom + 1);
      expect(state.video).toBe(width >= 1200);
      if (previous && Math.min(width, previous.width) === 1199 && Math.max(width, previous.width) === 1200) expect(Math.abs(state.font - previous.font)).toBeLessThan(3);
      previous = {width, font: state.font};
      if (width >= 768 && width < 1200) {
        expect(state.art.top).toBeLessThan(state.copy.bottom);
        expect(state.art.width / state.art.height).toBeCloseTo(16 / 9, 3);
        expect(state.fit).toBe('contain');
        expect(state.hero.height).toBeLessThan(900);
      }
    }
  });
}

test('product selection survives wide/compact/phone round trips', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/zh-hant');
  await page.waitForFunction(() => document.querySelector('#products')?.getAttribute('data-enhanced') === 'true');
  await page.locator('#products').scrollIntoViewIfNeeded();
  await page.locator('[data-products-next]').click();
  await page.waitForTimeout(700);
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product', '2');
  for (const width of [1199, 931, 768, 390, 820, 1199, 1200, 1440]) {
    await page.setViewportSize({width, height: 900});
    await page.waitForTimeout(500);
    await expect(page.locator('#products-title')).toBeInViewport();
    await expect(page.locator('#products')).toHaveAttribute('data-active-product', '2');
    await expect(page.locator('#products')).toHaveAttribute('data-carousel', String(width >= 1200));
    if (width < 1200) {
      await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
      await expect(page.locator('.lh-product-slot[data-active="true"]')).toBeInViewport();
    }
  }
});

test('wide/compact title handoff remains continuous in short and tall windows', async ({page}) => {
  await page.goto('/zh-hant');
  await page.waitForFunction(() => document.querySelector('#products')?.getAttribute('data-enhanced') === 'true');
  for (const height of [498, 545, 720, 900]) {
    let previous: number | undefined;
    for (const width of [1200, 1199, 1200]) {
      await page.setViewportSize({width, height});
      await page.waitForTimeout(350);
      const font = await page.locator('#hero-title').evaluate(e => parseFloat(getComputedStyle(e).fontSize));
      if (previous !== undefined) expect(Math.abs(font - previous)).toBeLessThan(3);
      previous = font;
    }
  }
});
