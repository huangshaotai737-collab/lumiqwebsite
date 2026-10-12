import { expect, test } from '@playwright/test';

test('glass carousel rotates all products and does not retrigger under a stationary pointer', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop hover carousel');
  await page.goto('/en#products');
  const section = page.locator('.lh-products');
  await expect(page.locator('.lh-home')).toHaveAttribute('data-home-state', 'open', {timeout:60000});
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute('data-carousel','true');
  const state = () => section.getAttribute('data-active-product');
  const first = await state();
  await section.locator('[data-offset="1"]').hover();
  await expect.poll(state).not.toBe(first);
  const selected = await state();
  await page.waitForTimeout(1000);
  expect(await state()).toBe(selected);
  await page.mouse.move(5,5);
  const visited = new Set<string|null>();
  for(let i=0;i<5;i++) {
    await section.locator('[data-products-next]').click();
    visited.add(await state());
  }
  expect(visited.size).toBe(5);
  expect(await state()).toBe(selected);
  expect(await section.locator('.lh-product-slot:not([inert])').count()).toBe(3);
});
