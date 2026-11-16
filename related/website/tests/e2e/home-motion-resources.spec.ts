import {expect, test, type Page} from '@playwright/test';

async function enterSection(page: Page, selector: string) {
  await page.locator(selector).evaluate(element => {
    window.scrollTo({top: element.getBoundingClientRect().top + scrollY, behavior: 'instant'});
  });
}

// UI-MOTION-01: loading the next chapter must not keep an invisible WebGL scene rendering.
test('offscreen product rendering stops while films remain interactive', async ({page}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({width: 1440, height: 900});
  await page.addInitScript(() => {
    const state = window as typeof window & {productDraws: number};
    state.productDraws = 0;
    const original = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function(...args) {
      if ((this.canvas as HTMLCanvasElement).closest?.('.lh-glass-products')) state.productDraws++;
      return original.apply(this, args);
    };
  });
  await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
  await enterSection(page, '.lh-products-stage');
  await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout: 30_000});
  await enterSection(page, '.lh-films-section');
  await expect.poll(() => page.locator('.lh-glass-products').evaluate(e => e.getBoundingClientRect().bottom)).toBeLessThan(0);
  // Allow the observer notification and its last in-flight frame to finish.
  await page.waitForTimeout(300);
  const read = () => page.evaluate(() => (window as typeof window & {productDraws: number}).productDraws);
  const before = await read();
  await page.waitForTimeout(500);
  expect(await read()).toBe(before);
  await page.locator('.lh-films-controls button').last().click();
  await expect(page.locator('.lh-films-controls strong')).toHaveText('02');
});

// UI-LAYOUT-16x4: the complete primary film and both navigation buttons fit the screen.
for (const viewport of [{width: 2560, height: 640}, {width: 3840, height: 960}]) {
  test(`16:4 film card fits at ${viewport.width} by ${viewport.height}`, async ({page}) => {
    await page.setViewportSize(viewport);
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
    await enterSection(page, '.lh-films-section');
    await expect.poll(() => page.locator('.lh-films-section').evaluate(e => Math.abs(e.getBoundingClientRect().top))).toBeLessThan(2);
    const bounds = await page.locator('.lh-film-card, .lh-films-controls').evaluateAll(elements => elements.map(e => e.getBoundingClientRect().toJSON()));
    for (const box of bounds) {
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(viewport.height);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  });
}

// UI-MOTION-02: a window drag preserves the chapter; controls remain usable
// immediately after crossing the desktop breakpoint. Use real pointer input:
// locator.click() may scroll an inert control into view while retrying it.
for (const entry of ['anchor', 'wheel'] as const) {
  test(`${entry}: phone to desktop keeps films interactive without mounting offscreen glass`, async ({page}) => {
    await page.setViewportSize({width: 390, height: 900});
    await page.goto(`/zh-hant${entry === 'anchor' ? '#films' : ''}`, {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-mobile-films-controls')).toBeAttached();
    if (entry === 'wheel') {
      const distance = await page.locator('.lh-films-section').evaluate(e => e.getBoundingClientRect().top - 86);
      await page.mouse.wheel(0, distance);
    }
    const film = page.locator('.lh-films-section');
    await expect.poll(() => film.evaluate(e => e.getBoundingClientRect().top)).toBeLessThan(100);
    // Let the initial wheel/anchor settle before starting a separate window drag.
    await page.waitForTimeout(350);
    const before = await film.evaluate(e => e.getBoundingClientRect().top);
    // Preserve the original chapter through one continuous resize transaction.
    for (const width of [1199, 1200, 1201, 1440]) {
      await page.setViewportSize({width, height: 900});
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    }
    await expect.poll(async () => Math.abs(await film.evaluate(e => e.getBoundingClientRect().top) - before)).toBeLessThan(12);
    await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
    // The invisible opening must not disable chapters while its decoder waits.
    await expect(film).not.toHaveAttribute('inert', {timeout: 2000});
    const next = page.locator('.lh-films-controls button').last();
    for (const count of ['02', '03', '01']) {
      const box = await next.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(900);
      await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await expect(page.locator('.lh-films-controls strong')).toHaveText(count, {timeout: 2000});
    }
    await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
    expect(Math.abs(await film.evaluate(e => e.getBoundingClientRect().top) - before)).toBeLessThan(12);
  });
}

// Both visible and below-fold content remain interactive during media buffering.
test('lower chapters stay interactive while the opening buffers', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/ola-scroll-v16-scrub.mp4', async route => { await delayed; await route.continue().catch(() => {}); });
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
    await enterSection(page, '.lh-films-section');
    await expect(page.locator('#films')).not.toHaveAttribute('inert');
    await page.locator('.lh-films-controls button').last().click();
    await expect(page.locator('.lh-films-controls strong')).toHaveText('02');
  } finally { release(); }
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true', {timeout: 15000});
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('aria-busy');
  await expect(page.locator('#films')).not.toHaveAttribute('inert');
});

test('reduced motion keeps films usable without opening or card travel', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/zh-hant#films', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true');
  await expect(page.locator('#films')).not.toHaveAttribute('inert');
  await expect(page.locator('.lh-film-character')).toBeHidden();
  const next = page.locator('.lh-films-controls button').last();
  await next.click();
  await expect(page.locator('.lh-films-controls strong')).toHaveText('02');
  expect(await page.locator('.lh-film-slot').first().evaluate(e => getComputedStyle(e).transitionDuration)).toBe('0s');
  await expect(page.locator('.lh-opening-video')).not.toHaveAttribute('src');
});
