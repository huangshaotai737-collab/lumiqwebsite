import {expect, test} from '@playwright/test';

test('five products and more form an open two-column grid with descriptions', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 1000});
  await page.goto('/en/products');
  const cards = page.locator('#all-products .prod-catalog-card');
  await expect(cards).toHaveCount(6);
  await page.locator('#all-products').scrollIntoViewIfNeeded();
  await expect(cards.locator('h3')).toHaveText(['Lumiq Ola', 'Lumiq Ola Go', 'Lumiq Tablet', 'Lumiq Print', 'Lumiq Nest 15', 'more']);
  const boxes = await cards.evaluateAll(elements => elements.map(el => {
    const {x, y, width, height} = el.getBoundingClientRect();
    return {x, y, width, height};
  }));
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
  expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height - 1);
  expect(Math.abs(boxes[2].x - boxes[0].x)).toBeLessThan(2);
  expect(Math.abs(boxes[5].x - boxes[1].x)).toBeLessThan(2);
  await expect(cards.last()).not.toHaveAttribute('href');
  await expect(cards.locator('canvas')).toHaveCount(0);
  await expect(cards.locator('.prod-catalog-description')).toHaveCount(5);
  for (const text of await cards.locator('.prod-catalog-description').allTextContents()) {
    expect(text.trim().split(/\s+/).length).toBeGreaterThan(5);
    expect(text.trim().split(/\s+/).length).toBeLessThanOrEqual(120);
  }
  const styles = await cards.evaluateAll(elements => elements.map(el => {
    const s = getComputedStyle(el);
    return {background: s.backgroundColor, shadow: s.boxShadow, radius: s.borderRadius, right: s.borderRightWidth, top: s.borderTopWidth};
  }));
  expect(styles[0]).toEqual({background: 'rgba(0, 0, 0, 0)', shadow: 'none', radius: '0px', right: '1px', top: '0px'});
  expect(styles[2].top).toBe('1px');
  await expect(cards.locator('button, svg')).toHaveCount(0);
  const hrefs = await cards.evaluateAll(elements => elements.filter(el => el.hasAttribute('href')).map(el => el.getAttribute('href')));
  expect(new Set(hrefs).size).toBe(5);
  await cards.first().click();
  await expect(page).toHaveURL(/\/en\/products\/ola/);
});

test('catalog adapts to tablet and mobile without horizontal overflow', async ({page}) => {
  await page.goto('/en/products');
  for (const width of [820, 390]) {
    await page.setViewportSize({width, height: 900});
    const cards = page.locator('#all-products .prod-catalog-card');
    await expect(cards).toHaveCount(6);
    const boxes = await cards.evaluateAll(elements => elements.map(el => {
      const {x, y, width, height} = el.getBoundingClientRect(); return {x, y, width, height};
    }));
    for (const box of boxes) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
    if (width === 820) expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
    else expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height - 1);
  }
});
