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
  await page.mouse.wheel(120, 0);
  await expect(stage).not.toHaveAttribute('aria-labelledby', initial!);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeCardWheel);

  const afterCardWheel = await stage.getAttribute('aria-labelledby');
  const carouselWidth = (await page.locator('.prod-carousel').boundingBox())!.width;
  await expect.poll(async () => (await stage.boundingBox())?.width ?? 0).toBeGreaterThan(carouselWidth * .68);
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

test('side captions have breathing room and cards slide into place above centered controls', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop card animation');
  await page.setViewportSize({width: 1856, height: 1000});
  await page.goto('/en/products#lineup');

  const stage = page.locator('.prod-stage');
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-carousel-ready', 'true');

  for (const width of [1024, 1200, 1440, 1856]) {
    await page.setViewportSize({width, height: 1000});
    for (const side of ['previous', 'next']) {
      const inset = await page.locator(`.prod-slide[data-slot="${side}"]`).evaluate(card => {
        const box = card.getBoundingClientRect();
        const label = card.querySelector<HTMLElement>('.prod-peek-caption')!;
        const caption = label.getBoundingClientRect();
        return {outerLeft: box.left, outerRight: innerWidth - box.right,
          left: caption.left - box.left, right: box.right - caption.right,
          bottom: box.bottom - caption.bottom, captionWidth: label.clientWidth,
          captionScrollWidth: label.scrollWidth};
      });
      expect(inset.outerLeft).toBeGreaterThan(20);
      expect(inset.outerRight).toBeGreaterThan(20);
      expect(inset.left).toBeGreaterThan(width >= 1400 ? 24 : 20);
      expect(inset.right).toBeGreaterThan(width >= 1400 ? 24 : 20);
      expect(inset.bottom).toBeGreaterThan(26);
      expect(inset.captionScrollWidth).toBeLessThanOrEqual(inset.captionWidth + 1);
    }
  }
  await stage.scrollIntoViewIfNeeded();

  const incoming = page.locator('.prod-slide[data-product-id="ola-go"]');
  const before = (await incoming.boundingBox())!;
  const controls = page.locator('.prod-lineup-controls');
  const placement = (await controls.boundingBox())!;
  const carousel = (await page.locator('.prod-carousel').boundingBox())!;
  expect(placement.y).toBeGreaterThanOrEqual(carousel.y + carousel.height - 1);
  expect(Math.abs(placement.x + placement.width / 2 - 1856 / 2)).toBeLessThan(2);
  const samplesPromise = incoming.evaluate(card => new Promise<Array<{slot: string | undefined; x: number; width: number; opacity: number}>>(resolve => {
    const samples: Array<{slot: string | undefined; x: number; width: number; opacity: number}> = [];
    const start = performance.now();
    const capture = () => {
      const box = card.getBoundingClientRect();
      samples.push({slot: (card as HTMLElement).dataset.slot, x: box.x, width: box.width,
        opacity: Number(getComputedStyle(card).opacity)});
      if (performance.now() - start < 700) requestAnimationFrame(capture);
      else resolve(samples);
    };
    requestAnimationFrame(capture);
  }));
  await incoming.click();
  const samples = await samplesPromise;
  const centerFrames = samples.filter(frame => frame.slot === 'center');
  await expect(incoming).toHaveAttribute('data-slot', 'center');
  const after = (await incoming.boundingBox())!;
  expect(centerFrames.some(f => f.x < before.x - 2 && f.x > after.x + 2
    && f.width > before.width + 1 && f.width < after.width - 1), 'incoming card travels and scales between the two resting positions').toBe(true);
  expect(centerFrames.every(f => f.opacity > .5), 'moving card remains visible').toBe(true);
  await controls.locator('button').first().click();
  await expect(stage).toHaveAttribute('data-product-id','pal');
  expect(after.width).toBeGreaterThan(before.width * 2);
});

test('compact cards keep controls centered below them while arrows that cycle all five products', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'responsive viewport on desktop browser');
  for (const width of [320, 390, 430, 767]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/en/products#lineup');
    await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
    const stage = page.locator('.prod-stage');
    // Same-page hash navigation preserves the selection from the last viewport.
    await page.reload();
    await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
    await expect(stage).toHaveAttribute('data-product-id', 'pal');
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    await stage.evaluate(element => window.scrollTo({top: scrollY + element.getBoundingClientRect().top - 100, behavior: 'instant'}));
    const controls = page.locator('.prod-lineup-controls');
    const previous = controls.getByRole('button').first();
    const next = controls.getByRole('button').last();
    const card = (await stage.boundingBox())!;
    const left = (await previous.boundingBox())!;
    const right = (await next.boundingBox())!;
    expect(left.y).toBeGreaterThanOrEqual(card.y + card.height - 1);
    expect(Math.abs((left.x + right.x + right.width)/2 - width/2)).toBeLessThan(2);
    expect(Math.abs(right.y - left.y)).toBeLessThan(1);
    expect(left.width).toBeGreaterThanOrEqual(44);
    expect(left.height).toBeGreaterThanOrEqual(44);
    for (const id of ['ola-go', 'tablet', 'book', 'nest', 'pal']) {
      await next.click();
      await expect(stage).toHaveAttribute('data-product-id', id);
    }
    await previous.click();
    await expect(stage).toHaveAttribute('data-product-id', 'nest');
    await expect(controls).toContainText('05 / 05');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  }
});
