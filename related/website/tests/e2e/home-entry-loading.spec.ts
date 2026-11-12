import {expect, test} from '@playwright/test';
import loadingImages from '../../lib/home-loading-image-manifest.json';

const lowLearn = loadingImages['/assets/home-video/learn.webp'];
const movies = [
  '/assets/home-video/compat-20261008/ola-scroll-v16-scrub.mp4',
  '/assets/site-backgrounds-20261108/pearl-flow-scroll.mp4',
] as const;
const held = () => {
  let release!: () => void;
  const wait = new Promise<void>(resolve => {release = resolve;});
  return {wait, release};
};

test('entry waits for decoded 480 artwork while full quality downloads concurrently', async ({page}) => {
  await page.setViewportSize({width:1440, height:900});
  const gate = held();
  let requested = false;
  const high: string[] = [];
  page.on('request', request => {
    if (/\/home-responsive-20260907\/learn-/.test(request.url())) high.push(request.url());
  });
  await page.route(url => url.pathname === lowLearn, async route => {
    requested = true;
    await gate.wait;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
    await expect.poll(() => requested).toBe(true);
    await expect.poll(() => high.length).toBeGreaterThan(0);
    await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'loading');
    await expect(page.locator('.lh-home')).toHaveAttribute('aria-busy', 'true');
    gate.release();
    await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
    const artwork = page.locator('.lh-rhythm-learn img');
    await expect(artwork).toHaveAttribute('data-home-quality', 'full');
    await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain('/home-responsive-20260907/learn-');
    await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.locator('.lh-home')).toHaveAttribute('aria-busy', 'false');
  } finally {gate.release();}
});

for (const [index, movie] of movies.entries()) {
  test(`entry waits for the complete ${index === 0 ? 'opening' : 'background'} movie and reuses the download`, async ({page}) => {
    await page.setViewportSize({width:1440, height:900});
    const gate = held();
    let requested = false;
    let downloads = 0;
    page.on('request', request => {if (new URL(request.url()).pathname === movie) downloads++;});
    await page.route(url => url.pathname === movie, async route => {
      requested = true;
      await gate.wait;
      await route.continue().catch(() => {});
    });
    try {
      await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
      await expect.poll(() => requested).toBe(true);
      await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'loading');
      await expect(page.locator('.lh-home')).toHaveAttribute('aria-busy', 'true');
      gate.release();
      await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
      await expect(page.locator('.lh-opening-video')).toHaveAttribute('src', /^blob:/);
      await page.locator('#products').evaluate(element => element.scrollIntoView({behavior:'instant'}));
      await expect(page.locator('[data-background-video]')).toHaveAttribute('src', /^blob:/);
      expect(downloads).toBe(1);
    } finally {gate.release();}
  });
}

test('a failed entry image presents a working retry instead of exposing an incomplete home', async ({page}) => {
  let fail = true;
  await page.route(url => url.pathname === lowLearn, route => fail
    ? route.fulfill({status:503, contentType:'text/plain', body:'controlled entry image failure'})
    : route.continue());
  await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'error');
  await expect(page.locator('.lh-home')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.lh-home')).toHaveAttribute('inert', '');
  fail = false;
  await page.locator('.lh-loader-actions button').click();
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  await expect(page.locator('.lh-home')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.lh-home')).not.toHaveAttribute('inert');
});

for (const reduced of [false, true]) {
  test(`phone ${reduced ? 'with reduced motion' : 'with normal motion'} finishes both complete movies before entry`, async ({page}) => {
    await page.setViewportSize({width:390, height:844});
    await page.emulateMedia({reducedMotion: reduced ? 'reduce' : 'no-preference'});
    const completed = new Set<string>();
    page.on('requestfinished', request => {
      const pathname = new URL(request.url()).pathname;
      if (movies.some(movie => movie === pathname)) completed.add(pathname);
    });
    await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
    await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
    expect([...completed].sort()).toEqual([...movies].sort());
    await expect(page.locator('.lh-home')).toHaveAttribute('aria-busy', 'false');
  });
}

test('tablet artwork and CSS backgrounds stay at decoded 480 quality until their full images arrive', async ({page}) => {
  await page.setViewportSize({width:820, height:1180});
  const sources = new Set([
    '/assets/home-video/ola-scroll-v16-start-20260909.webp',
    '/assets/home-video/ola-scroll-v16-end-20260909.webp',
    ...['desktop', 'compact', 'mobile', 'poster'].map(name => `/assets/site-backgrounds-20261108/pearl-flow-${name}.webp`),
  ]);
  const gate = held();
  const requested = new Set<string>();
  await page.route(url => sources.has(url.searchParams.get('url') ?? url.pathname), async route => {
    const url = new URL(route.request().url());
    requested.add(url.searchParams.get('url') ?? url.pathname);
    await gate.wait;
    await route.continue().catch(() => {});
  });
  const hero = page.locator('.lh-mobile-hero-art img');
  const ola = page.locator('.lh-mobile-ola-art img');
  const background = () => page.locator('#products').evaluate(element => getComputedStyle(element, '::before').backgroundImage);
  try {
    await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
    await expect.poll(() => requested.has('/assets/home-video/ola-scroll-v16-start-20260909.webp')).toBe(true);
    // Neither the tablet <picture> source nor a CSS background may bypass the
    // entry tier and wait for a still-blocked full image before painting.
    await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
    await expect.poll(() => hero.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain('/home-loading-480/ola-scroll-v16-start-');
    await expect.poll(() => ola.evaluate((image: HTMLImageElement) => image.currentSrc)).toContain('/home-loading-480/ola-scroll-v16-end-');
    await expect.poll(background).toContain('/home-loading-480/pearl-flow-compact-');
    for (const artwork of [hero, ola]) {
      await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 480)).toBe(true);
    }
    gate.release();
    await expect(hero).toHaveAttribute('data-home-quality', 'full');
    await expect(ola).toHaveAttribute('data-home-quality', 'full');
    await expect.poll(background).toContain('/site-backgrounds-20261108/pearl-flow-compact.webp');
    for (const artwork of [hero, ola]) {
      await expect.poll(() => artwork.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    }
  } finally {gate.release();}
});

test('a direct film chapter hash stays at that chapter after the loading gate opens', async ({page}) => {
  await page.setViewportSize({width:1440, height:1000});
  await page.goto('/zh-hant#films', {waitUntil:'domcontentloaded'});
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  await expect.poll(() => page.locator('#films').evaluate(element => {
    const top = element.getBoundingClientRect().top;
    return top >= -100 && top < innerHeight / 2;
  })).toBe(true);
  await expect(page).toHaveURL(/#films$/);
});

for (const width of [1440, 390]) {
  test(`${width}px active film poster uses its decoded 480 cover while all full covers are delayed`, async ({page}) => {
    await page.setViewportSize({width, height:1000});
    const covers = new Set(['everyday-companion', 'worlds-together', 'welcome-home']
      .map(name => `/assets/films-20260908/${name}.jpg`));
    const gate = held();
    let fullRequested = false;
    await page.route(url => covers.has(url.searchParams.get('url') ?? url.pathname), async route => {
      fullRequested = true;
      await gate.wait;
      await route.continue().catch(() => {});
    });
    const video = page.locator(width < 768 ? '.lh-mobile-film-card video' : '.lh-film-card video');
    try {
      await page.goto('/zh-hant#films', {waitUntil:'domcontentloaded'});
      await expect.poll(() => fullRequested).toBe(true);
      await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
      await expect(video).toHaveAttribute('poster', /\/home-loading-480\/everyday-companion-.*-480\.webp/);
      expect(await video.evaluate(async (element: HTMLVideoElement) => {
        const image = new Image(); image.src = element.poster; await image.decode(); return image.naturalWidth;
      })).toBe(480);
      gate.release();
      await expect(video).toHaveAttribute('poster', '/assets/films-20260908/everyday-companion.jpg');
      expect(await video.evaluate(async (element: HTMLVideoElement) => {
        const image = new Image(); image.src = element.poster; await image.decode(); return image.naturalWidth;
      })).toBeGreaterThan(480);
    } finally {gate.release();}
  });
}
