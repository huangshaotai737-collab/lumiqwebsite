import { expect, test } from '@playwright/test';

test('a horizontal trackpad swipe changes one family card without moving the page', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden', { timeout: 30_000 });
  const cards = page.locator('.lh-family-chapters');
  const stage = cards.locator('.lh-family-stage');
  await stage.scrollIntoViewIfNeeded();
  await stage.hover();
  const beforeY = await page.evaluate(() => scrollY);

  await page.mouse.wheel(120, 0);

  await expect(cards).toHaveAttribute('data-active-family', '1');
  expect(await page.evaluate(() => scrollY)).toBe(beforeY);
});

test('dragging the family card right selects the previous card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden', { timeout: 30_000 });
  const cards = page.locator('.lh-family-chapters');
  const stage = cards.locator('.lh-family-stage');
  await stage.scrollIntoViewIfNeeded();
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 110, y, { steps: 6 });
  await page.mouse.up();

  await expect(cards).toHaveAttribute('data-active-family', '2');
});

test('clicking the left preview on the first card wraps to the last card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden', { timeout: 30_000 });
  const cards = page.locator('.lh-family-chapters');
  await cards.locator('.lh-family-stage').scrollIntoViewIfNeeded();

  await cards.getByRole('button', { name: 'Bedtime imagination' }).click({ timeout: 5_000 });

  await expect(cards).toHaveAttribute('data-active-family', '2');
});

test('clicking the right preview on the last card wraps to the first card', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/en');
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden', { timeout: 30_000 });
  const cards = page.locator('.lh-family-chapters');
  await cards.locator('#family-tab-evening').click();
  await expect(cards).toHaveAttribute('data-active-family', '2');

  await cards.getByRole('button', { name: 'Morning together' }).click({ timeout: 5_000 });

  await expect(cards).toHaveAttribute('data-active-family', '0');
});
