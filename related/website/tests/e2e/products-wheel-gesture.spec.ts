import {expect, test} from '@playwright/test';

test('vertical wheel scrolls the page without changing the product', async ({page}) => {
  await page.setViewportSize({width:1856,height:1100});
  await page.goto('/en/products#lineup');
  const active=page.locator('.prod-stage');
  await active.scrollIntoViewIfNeeded();
  await expect(active).toHaveAttribute('data-carousel-ready','true');
  await active.hover();
  const id=await active.getAttribute('data-product-id');
  const y=await page.evaluate(()=>scrollY);
  await page.mouse.wheel(0,240);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(y);
  await expect(active).toHaveAttribute('data-product-id',id!);
});

test('a long wheel burst advances one card, and a fresh gesture advances one more', async ({page}) => {
  await page.setViewportSize({width: 1856, height: 1000});
  await page.goto('/en/products#lineup');
  const active = page.locator('.prod-stage');
  await active.scrollIntoViewIfNeeded();
  await expect(active).toHaveAttribute('data-carousel-ready', 'true');
  await expect(active.locator('canvas')).toBeVisible();
  await active.hover();
  await page.evaluate(async () => {
    const start = performance.now();
    for (let i = 0; i < 20; i++) {
      const event = new WheelEvent('wheel', {deltaX: Math.max(2, 120 - i * 7), bubbles: true, cancelable: true});
      // Model hardware timestamps independently of WebGL/main-thread stalls.
      Object.defineProperty(event, 'timeStamp', {value: start + i * 80});
      document.querySelector('.prod-stage')!.dispatchEvent(event);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  });
  await expect(active).toHaveAttribute('data-product-id', 'ola-go');
  await page.waitForTimeout(800);
  await active.hover();
  await page.mouse.wheel(120, 0);
  await expect(active).toHaveAttribute('data-product-id', 'tablet');
});

test('rapid button clicks cannot skip intermediate cards', async ({page}) => {
  await page.goto('/en/products#lineup');
  await page.locator('.prod-stage').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    for (let i = 0; i < 4; i++) {
      (document.querySelector('.prod-stage .prod-stage-nav button:last-child') as HTMLButtonElement).click();
    }
  });
  await expect(page.locator('.prod-stage')).toHaveAttribute('data-product-id', 'ola-go');
});
