import {expect, test} from '@playwright/test';


test('product images sit directly on the frosted carousel cards without inner panels', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop carousel cards');
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/en/products#lineup');

  const media = page.locator('.prod-slide[data-slot="center"] .prod-stage-media, .prod-slide[data-slot="previous"] .prod-stage-media, .prod-slide[data-slot="next"] .prod-stage-media');
  await expect(media).toHaveCount(3);
  for (const panel of await media.all()) {
    const styles = await panel.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundImage,
        backgroundColor: style.backgroundColor,
        borderWidth: style.borderTopWidth,
        shadow: style.boxShadow,
        backdropFilter: style.backdropFilter,
      };
    });
    expect(styles).toEqual({
      background: 'none',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderWidth: '0px',
      shadow: 'none',
      backdropFilter: 'none',
    });
  }
});

test('lineup shows side previews and changes only from card interactions', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop card layout');
  await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/en/products#lineup');

  const stage = page.locator('.prod-stage');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-carousel-ready', 'true');
  await expect(page.locator('.prod-peek')).toHaveCount(2);
  await expect(page.locator('.prod-peek--previous')).toBeVisible();
  await expect(page.locator('.prod-peek--next')).toBeVisible();

  const initial = await stage.getAttribute('aria-labelledby');
  await page.waitForTimeout(5500);
  await expect(stage).toHaveAttribute('aria-labelledby', initial!);

  await stage.hover();
  const scrollBeforeCardWheel = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 120);
  await expect(stage).not.toHaveAttribute('aria-labelledby', initial!);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeCardWheel);

  const afterCardWheel = await stage.getAttribute('aria-labelledby');
  await expect.poll(async () => (await stage.boundingBox())?.width ?? 0).toBeGreaterThan(950);
  await expect.poll(() => stage.evaluate((element) =>
    element.getAnimations().some((animation) => animation.playState === 'running'),
  )).toBe(false);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  const carouselBox = await page.locator('.prod-carousel').boundingBox();
  expect(carouselBox).not.toBeNull();
  await page.mouse.move(carouselBox!.x + carouselBox!.width / 2, carouselBox!.y - 24);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.mouse.wheel(0, 100);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore);
  await expect(stage).toHaveAttribute('aria-labelledby', afterCardWheel!);
});

test('the next card travels into the center with its product image fully visible at the side', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop card animation');
  await page.setViewportSize({width: 1856, height: 1000});
  await page.goto('/en/products#lineup');

  const stage = page.locator('.prod-stage');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-carousel-ready', 'true');

  const incoming = await page.locator('.prod-peek--next').elementHandle();
  expect(incoming).not.toBeNull();
  const before = await incoming!.boundingBox();
  const stageBefore = await stage.boundingBox();
  const sideImage = await incoming!.waitForElementState('visible').then(() => incoming!.$('img'));
  const imageBefore = await sideImage?.boundingBox();
  expect(before).not.toBeNull();
  expect(stageBefore).not.toBeNull();
  expect(imageBefore).not.toBeNull();
  expect(imageBefore!.x).toBeGreaterThanOrEqual(stageBefore!.x + stageBefore!.width);

  await stage.hover();
  const travelSamples = incoming!.evaluate((card) => new Promise<number[]>((resolve) => {
    const positions: number[] = [];
    const started = performance.now();
    const capture = () => {
      positions.push(card.getBoundingClientRect().x);
      if (performance.now() - started < 1200) requestAnimationFrame(capture);
      else resolve(positions);
    };
    requestAnimationFrame(capture);
  }));
  await page.mouse.wheel(0, 120);
  await expect.poll(() => incoming!.evaluate((card) => card.classList.contains('prod-stage'))).toBe(true);
  const positions = await travelSamples;
  const after = await incoming!.boundingBox();
  expect(after).not.toBeNull();
  expect(positions.some((x) => x < before!.x - 20 && x > after!.x + 20), 'incoming card should occupy positions between side and center').toBe(true);
  expect(after!.width).toBeGreaterThan(before!.width * 2);
});

test('the active card fills the mobile content width without horizontal overflow', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'mobile viewport on desktop browser');
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/en/products#lineup');
  const stage = page.locator('.prod-stage');
  const box = await stage.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(340);
  expect(box!.x).toBeLessThan(25);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});
