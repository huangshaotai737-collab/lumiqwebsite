import {test, expect} from '@playwright/test';

test('mobile 480 opening image starts at high network priority', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'Network priority is observed through Chromium CDP.');
  await page.setViewportSize({width:390, height:844});
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const priorities: string[] = [];
  cdp.on('Network.requestWillBeSent', event => {
    if (/\/home-loading-480\/hero-unified-.*-480\.webp/.test(event.request.url)) priorities.push(event.request.initialPriority);
  });
  await page.goto('/zh-hant');
  await expect.poll(() => page.locator('.lh-mobile-hero-art img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(priorities).toEqual(['High']);
});

test('a phone receives a smaller opening image without changing the artwork', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  const imageResponse = page.waitForResponse(response =>
    /\/home-loading-480\/hero-unified-.*-480\.webp/.test(response.url()) && response.status() === 200);
  await page.goto('/zh-hant');
  const response = await imageResponse;
  await expect.poll(() => page.locator('.lh-mobile-hero-art img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  // A 390px phone should not transfer the entire 941px/143KB source.
  expect((await response.body()).byteLength).toBeLessThan(100 * 1024);
  await expect(page.locator('.lh-mobile-hero-art img')).toHaveAttribute('data-home-source', '/assets/mobile-backgrounds-20260914/hero-unified.webp');
  expect(await page.evaluate(async source => {
    const image = new Image(); image.src = source; await image.decode(); return image.naturalWidth;
  }, response.url())).toBe(480);
});

test('phone preloads character stills but leaves its distant alpha animation on demand', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  const requests: string[] = [];
  page.on('request', request => {
    if (/\/character-20261012\/.*\.(webm|mov)/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-mobile-films-track')).toBeAttached();
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  expect(requests).toEqual([]);
});

test('film character still falls back to its approved image when the animation fails', async ({page}) => {
  await page.setViewportSize({width:1440, height:1000});
  await page.route('**/ola-girl-clean-alpha.webm', route => route.abort('failed'));
  await page.goto('/zh-hant#films');
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  // Exercise the media error itself, independently of the intersection-driven
  // play() timing while the loading gate and desktop pins finish their handoff.
  await page.locator('.lh-film-character').evaluate(host => host.querySelector('video')?.load());
  const image = page.locator('.lh-film-character img');
  await expect(image).toHaveAttribute('data-home-source', '/assets/character-20261012/settled-clean.png');
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test('desktop film character also waits for its chapter', async ({page}) => {
  await page.setViewportSize({width:1440, height:1000});
  const requests: string[] = [];
  page.on('request', request => {
    if (/\/character-20261012\/.*\.(webm|mov)/.test(request.url())) requests.push(request.url());
  });
  await page.goto('/zh-hant');
  // iPhone emulation may reject HEVC alpha and use the approved still. Both
  // renderer paths must remain inactive until the film chapter approaches.
  await expect(page.locator('.lh-film-character')).toHaveAttribute('data-visible', 'false');
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  expect(requests).toEqual([]);
});
