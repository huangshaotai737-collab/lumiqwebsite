import {expect, test} from '@playwright/test';

test.beforeEach(({page}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1200, 'The scroll film is desktop only');
});

test('opening video seeks to the second composition and reverses', async ({page}) => {
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
  await expect.poll(() => page.locator('.lh-opening-video').evaluate((v: HTMLVideoElement) =>
    !v.seeking && v.currentTime > v.duration - .15)).toBe(true);
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect.poll(() => page.locator('.lh-opening-video').evaluate((v: HTMLVideoElement) =>
    !v.seeking && v.currentTime < .05)).toBe(true);
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
});

// The media boundary is deliberately held at its already decoded first frame:
// models a pending decoder/seek without replacing layout, scrolling or GSAP.
test('a stalled seek never leaves first-frame hardware behind second-screen copy', async ({page}) => {
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>('.lh-opening-video')!;
    const time = video.currentTime;
    Object.defineProperty(video, 'currentTime', {configurable: true, get: () => time, set: () => {}});
    Object.defineProperty(video, 'seeking', {configurable: true, get: () => true});
    scrollTo({top: innerHeight * 2.85 * .55, behavior: 'instant'});
  });
  await expect.poll(() => page.locator('.lh-ola-copy').evaluate(e => Number(getComputedStyle(e).opacity))).toBeGreaterThan(.5);
  await expect(page.locator('.lh-video-layer')).not.toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.lh-video-end-poster')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('.lh-video-end-poster')).toHaveCSS('opacity', '1');
  await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  await page.screenshot({path: test.info().outputPath('stalled-seek.png')});
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.lh-video-end-poster')).toHaveCSS('opacity', '0');
  await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>('.lh-opening-video')!;
    delete (video as unknown as Record<string, unknown>).currentTime;
    delete (video as unknown as Record<string, unknown>).seeking;
    video.dispatchEvent(new Event('canplay'));
    scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'});
  });
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await expect.poll(() => page.locator('.lh-opening-video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(6);
});

test('a fresh visit scrolled before the MP4 arrives uses the correct composition and recovers', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/compat-20261008/ola-scroll-v16-scrub.mp4', async route => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-video-mode', 'true');
    await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
    await expect(page.locator('.lh-video-layer')).not.toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.lh-video-end-poster')).toHaveCSS('visibility', 'visible');
    await expect(page.locator('.lh-video-end-poster')).toHaveCSS('opacity', '1');
    release();
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
    await expect.poll(() => page.locator('.lh-opening-video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(6);
  } finally { release(); }
});
