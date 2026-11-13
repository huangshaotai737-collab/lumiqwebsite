import {expect, test} from '@playwright/test';

test.beforeEach(({page}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1200, 'The scroll film is desktop only; mobile is covered by opening-media-sync');
});

// A decorative film must never be a prerequisite for reading or navigating.
test('scrolling and the hero action work while the opening film is pending', async ({page}) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/ola-scroll-v16-scrub.mp4', async route => {
    await pending;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-video-mode', 'true');
    await expect(page.locator('html')).not.toHaveCSS('overflow-y', 'hidden');
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
    await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
    await page.locator('.lh-hero-copy a[href="#products"]').click({timeout: 2000});
    await expect.poll(() => page.locator('#products').evaluate(e => e.getBoundingClientRect().top)).toBeLessThan(150);
    await expect(page.locator('#products')).not.toHaveAttribute('inert');
  } finally { release(); }
});

test('navigation and its menus work before the opening media responds', async ({page}) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/ola-scroll-v16-scrub.mp4', async route => {
    await pending;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-video-mode', 'true');
    await page.locator('.site-nav .lang-btn').click({timeout: 2000});
    await expect(page.locator('#site-language-options')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('.site-desktop-nav a[href="/zh-hant/products"]').click({timeout: 2000});
    await expect(page).toHaveURL(/\/zh-hant\/products$/, {timeout: 8000});
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('overflow-y', 'hidden');
  } finally { release(); }
});
