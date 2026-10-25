import {test, expect} from '@playwright/test';

test('mobile opening image starts at high network priority', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'Network priority is observed through Chromium CDP.');
  await page.setViewportSize({width:390, height:844});
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const priorities: string[] = [];
  cdp.on('Network.requestWillBeSent', event => {
    if (decodeURIComponent(event.request.url).includes('/mobile-backgrounds-20260914/hero-unified.webp')) priorities.push(event.request.initialPriority);
  });
  await page.goto('/zh-hant');
  await expect.poll(() => page.locator('.lh-mobile-hero-art img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  expect(priorities).toEqual(['High']);
});

test('a phone receives a smaller opening image without changing the artwork', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  const imageResponse = page.waitForResponse(response =>
    decodeURIComponent(response.url()).includes('/mobile-backgrounds-20260914/hero-unified.webp') && response.status() === 200);
  await page.goto('/zh-hant');
  const response = await imageResponse;
  await expect.poll(() => page.locator('.lh-mobile-hero-art img').evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  // A 390px phone should not transfer the entire 941px/143KB source.
  expect((await response.body()).byteLength).toBeLessThan(100 * 1024);
  expect(decodeURIComponent(await page.locator('.lh-mobile-hero-art img').evaluate(element => (element as HTMLImageElement).currentSrc)))
    .toContain('/mobile-backgrounds-20260914/hero-unified.webp');
});

test('distant film character does not compete with the opening image', async ({page}) => {
  await page.setViewportSize({width:390, height:844});
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/character-20261012/')) requests.push(request.url());
  });
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-mobile-films-track')).toBeAttached();
  expect(requests).toEqual([]);
});

test('film character still falls back to its approved image when the animation fails', async ({page}) => {
  await page.setViewportSize({width:1440, height:1000});
  await page.route('**/ola-girl-clean-alpha.webm', route => route.abort('failed'));
  await page.goto('/zh-hant#films');
  const image = page.locator('.lh-film-character img');
  await expect(image).toHaveAttribute('src', /character-20261012\/settled-clean\.png/);
  await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
});

test('desktop film character also waits for its chapter', async ({page}) => {
  await page.setViewportSize({width:1440, height:1000});
  const requests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/character-20261012/')) requests.push(request.url());
  });
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-film-character')).toHaveAttribute('data-alpha-video', 'true');
  expect(requests).toEqual([]);
});
