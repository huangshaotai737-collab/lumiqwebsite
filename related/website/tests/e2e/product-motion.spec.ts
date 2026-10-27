import {test, expect} from '@playwright/test';

for (const viewport of [{width:1440,height:900},{width:2560,height:640}]) {
  test(`product cards interpolate their position and size at ${viewport.width}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/zh-hant#products');
    await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
    const samples = await page.evaluate(async () => {
      const cards = [...document.querySelectorAll<HTMLElement>('.lh-product-slot')];
      const read = () => cards.map(card => {
        const r = card.getBoundingClientRect();
        return {x:r.x, width:r.width, bottom:r.bottom, opacity:Number(getComputedStyle(card).opacity)};
      });
      const before = read();
      document.querySelector<HTMLButtonElement>('[data-products-next]')!.click();
      const first = read();
      await new Promise(resolve => setTimeout(resolve, 200));
      const middle = read();
      await new Promise(resolve => setTimeout(resolve, 550));
      return {before,first,middle,last:read(),animations:cards.flatMap(card => card.getAnimations()).length};
    });
    // The next card must grow and move continuously, not jump to its new box.
    expect(Math.abs(samples.first[1].x-samples.before[1].x)).toBeLessThan(2);
    expect(Math.abs(samples.first[1].width-samples.before[1].width)).toBeLessThan(2);
    expect(samples.middle[1].width).toBeGreaterThan(samples.before[1].width+2);
    expect(samples.middle[1].width).toBeLessThan(samples.last[1].width-2);
    expect(samples.middle[1].x).toBeLessThan(samples.before[1].x);
    expect(samples.middle[1].x).toBeGreaterThan(samples.last[1].x);
    expect(Math.abs(samples.middle[1].bottom-samples.last[1].bottom)).toBeLessThan(2);
    // The leftmost card wraps to the far right rather than crossing the center.
    expect(Math.abs(samples.middle[3].x-samples.last[3].x)).toBeLessThan(2);
    expect(samples.animations).toBe(0);
    await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
  });
}

test('rapid reversal continues from the visible card pose and reduced motion settles immediately', async ({page}) => {
  await page.goto('/zh-hant#products');
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
  const jump = await page.evaluate(async () => {
    const card = document.querySelectorAll<HTMLElement>('.lh-product-slot')[1];
    document.querySelector<HTMLButtonElement>('[data-products-next]')!.click();
    await new Promise(resolve => setTimeout(resolve, 150));
    const before = card.getBoundingClientRect();
    document.querySelector<HTMLButtonElement>('[data-products-previous]')!.click();
    const after = card.getBoundingClientRect();
    return {x:Math.abs(before.x-after.x),width:Math.abs(before.width-after.width)};
  });
  expect(jump.x).toBeLessThan(2);
  expect(jump.width).toBeLessThan(2);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect.poll(() => page.locator('.lh-product-slot').evaluateAll(cards => cards.flatMap(card => card.getAnimations()).length)).toBe(0);
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product','1');
  expect(await page.locator('.lh-product-slot').evaluateAll(cards => cards.flatMap(card => card.getAnimations()).length)).toBe(0);
});
