import {expect, test} from '@playwright/test';

test('glass canvas fills the moving card throughout a page turn without a second base', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto('/en/products#lineup');
  const next = page.locator('.prod-slide[data-slot="next"]');
  await expect(next.locator('canvas')).toBeVisible();
  const samples = await next.evaluate(async element => {
    (element as HTMLElement).click();
    const results: number[] = [];
    for (let i = 0; i < 45; i++) {
      await new Promise(requestAnimationFrame);
      const canvas = element.querySelector('canvas')!;
      results.push(Math.abs(canvas.getBoundingClientRect().width - element.getBoundingClientRect().width));
    }
    return results;
  });
  expect(Math.max(...samples)).toBeLessThan(8);
  const face = await page.locator('.prod-slide[data-slot="center"]').evaluate(element => ({
    background: getComputedStyle(element).backgroundColor,
    blur: getComputedStyle(element).backdropFilter,
  }));
  expect(face).toEqual({background: 'rgba(0, 0, 0, 0)', blur: 'none'});
  expect(await page.locator('.prod-stage').evaluate(element => getComputedStyle(element).boxShadow)).toBe('none');
});

test('whole 3D glass surface replaces decorative rings and leaves controls accessible', async ({page}) => {
  await page.goto('/en/products#lineup');
  const card = page.locator('.prod-slide[data-slot="center"]');
  await expect(card.locator('canvas')).toBeVisible();
  await expect(page.locator('.prod-carousel-glow')).toHaveCount(0);
  expect(await card.evaluate(element => getComputedStyle(element, '::after').content)).toBe('none');
  const before = await card.getAttribute('data-product-id');
  await page.locator('.prod-slide[data-slot="next"]').click();
  await expect(card).not.toHaveAttribute('data-product-id', before!);
});
