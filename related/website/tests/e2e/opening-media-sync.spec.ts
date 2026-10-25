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

// Hold only the decoder boundary; scrolling and the layout remain real.
test('a pending seek retains its presented frame and matching copy', async ({page}) => {
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>('.lh-opening-video')!;
    const time = video.currentTime;
    Object.defineProperty(video, 'currentTime', {configurable: true, get: () => time, set: () => {}});
    Object.defineProperty(video, 'seeking', {configurable: true, get: () => true});
    scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'});
  });
  await expect.poll(() => page.locator('.lh-opening-video').evaluate(v => Number((v as HTMLVideoElement).dataset.scrollProgress))).toBeGreaterThan(.99);
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.lh-video-end-poster')).toHaveCSS('visibility', 'hidden');
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '0');
  await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>('.lh-opening-video')!;
    delete (video as unknown as Record<string, unknown>).currentTime;
    delete (video as unknown as Record<string, unknown>).seeking;
    video.dispatchEvent(new Event('canplay'));
  });
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
});

test('the opening waits for the complete download before revealing the film', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/compat-20261008/ola-scroll-v16-scrub.mp4', async route => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-video-mode', 'true');
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-opening-loading', 'true');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
    await expect(page.locator('.lh-opening-video')).not.toHaveAttribute('src', /.+/);
    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    release();
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
    await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-loading', 'true');
    await expect(page.locator('.lh-opening-video')).toHaveAttribute('src', /^blob:/);
    await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  } finally { release(); }
});

test('an unavailable film unlocks a stable readable layout', async ({page}) => {
  await page.route('**/compat-20261008/ola-scroll-v16-scrub.mp4', route => route.abort());
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true');
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-loading', 'true');
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.site-nav')).not.toHaveAttribute('inert', '');
  await page.evaluate(() => {
    const video = document.querySelector<HTMLVideoElement>('.lh-opening-video')!;
    video.dispatchEvent(new Event('canplay'));
    scrollTo({top: document.querySelector('#ola')!.getBoundingClientRect().top + scrollY, behavior: 'instant'});
  });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true');
  await expect(page.locator('.lh-video-layer')).not.toHaveAttribute('data-ready', 'true');
});


test('response headers and a first chunk cannot release the opening gate', async ({page}) => {
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      if (!String(args[0]).includes('ola-scroll-v16-scrub.mp4')) return response;
      const bytes = new Uint8Array(await response.arrayBuffer());
      return new Response(new ReadableStream({start(controller) {
        controller.enqueue(bytes.slice(0, 16384));
        (window as unknown as Record<string, unknown>).finishOpeningDownload = () => {
          controller.enqueue(bytes.slice(16384));
          controller.close();
        };
      }}), {headers: {'content-length': String(bytes.length), 'content-type': 'video/mp4'}});
    };
  });
  await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as {finishOpeningDownload?: unknown}).finishOpeningDownload)).toBe('function');
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-opening-loading', 'true');
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.lh-opening-video')).not.toHaveAttribute('src', /.+/);
  await page.evaluate(() => (window as unknown as {finishOpeningDownload: () => void}).finishOpeningDownload());
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-loading', 'true');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
});

// A healthy transfer may take longer than the former 12-second total deadline.
// Delay real movie bytes at the transport boundary; decoding and scrolling stay real.
test('a progressing slow download retains the scroll film', async ({page}) => {
  test.setTimeout(45_000);
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      if (!String(args[0]).includes('ola-scroll-v16-scrub.mp4')) return response;
      const bytes = new Uint8Array(await response.arrayBuffer());
      const chunkSize = Math.ceil(bytes.length / 5);
      return new Response(new ReadableStream({async start(controller) {
        for (let offset = 0; offset < bytes.length; offset += chunkSize) {
          if (offset) await new Promise(resolve => setTimeout(resolve, 3500));
          controller.enqueue(bytes.slice(offset, offset + chunkSize));
        }
        controller.close();
      }}), {headers: {'content-type': 'video/mp4'}});
    };
  });
  await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true', {timeout: 22000});
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-static-opening', 'true');
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-loading', 'true');
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.locator('.lh-opening-video').evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(1);
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
});

test('an endless trickle of bytes still releases the loading gate', async ({page}) => {
  test.setTimeout(45_000);
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      if (!String(args[0]).includes('ola-scroll-v16-scrub.mp4')) return original(...args);
      let timer = 0;
      return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array([0]));
          timer = window.setInterval(() => controller.enqueue(new Uint8Array([0])), 1000);
        },
        cancel() { clearInterval(timer); },
      }), {headers: {'content-type': 'video/mp4'}});
    };
  });
  await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-opening-loading', 'true');
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true', {timeout: 35000});
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-loading', 'true');
  await page.mouse.wheel(0, 900);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(200);
});

test('rapid forward and reverse scrolling never switches the revealed movie back to posters', async ({page}) => {
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    const layer = document.querySelector('.lh-video-layer')!;
    (window as unknown as {movieHidden: boolean}).movieHidden = false;
    new MutationObserver(records => {
      if (records.some(r => r.oldValue === 'true' && !layer.hasAttribute('data-ready')))
        (window as unknown as {movieHidden: boolean}).movieHidden = true;
    }).observe(layer, {attributes: true, attributeOldValue: true, attributeFilter: ['data-ready']});
  });
  for (const progress of [.9, .1, .65, .25, .95, 0]) {
    await page.evaluate(async p => {
      scrollTo({top: innerHeight * 2.85 * p, behavior: 'instant'});
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    }, progress);
  }
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
  expect(await page.evaluate(() => (window as unknown as {movieHidden: boolean}).movieHidden)).toBe(false);
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-static-opening', 'true');
});

test('a permanent decoder failure switches once to static content', async ({page}) => {
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('.lh-opening-video')!;
    Object.defineProperty(v, 'seeking', {configurable: true, get: () => true});
    scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'});
  });
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true', {timeout: 7000});
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  await expect(page.locator('.lh-rhythm-cards')).toBeVisible();
  await expect(page.locator('.lh-opening-video')).not.toHaveAttribute('src', /.+/);
});

test('a download that never completes cannot block navigation indefinitely', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/compat-20261008/ola-scroll-v16-scrub.mp4', async route => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-opening-loading', 'true');
    await expect(page.getByRole('progressbar')).toHaveCount(0);
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true', {timeout: 15000});
    await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-loading', 'true');
    release();
    await page.evaluate(() => document.querySelector('.lh-opening-video')!.dispatchEvent(new Event('canplay')));
    await expect(page.locator('.lh-opening-video')).not.toHaveAttribute('src', /.+/);
  } finally {release();}
});


test('mobile and reduced motion do not request the desktop film', async ({page}) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('ola-scroll-v16-scrub.mp4')) requests.push(request.url()); });
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-video-mode', 'true');
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-loading', 'true');
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1440, height: 900});
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true');
  expect(requests).toEqual([]);
});

test('browsers without frame callbacks still synchronize the decoded composition', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {configurable:true, value:undefined}));
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
});


test('lost media data after entry also releases into the static layout', async ({page}) => {
  await page.goto('/zh-hant');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('.lh-opening-video')!;
    Object.defineProperty(v, 'readyState', {configurable: true, get: () => 1});
    v.dispatchEvent(new Event('waiting'));
    scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'});
  });
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening', 'true', {timeout: 7000});
  await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
});


test('the first paint is already scroll locked before application scripts arrive', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release = resolve;});
  await page.route('**/_next/static/**/*.js', async route => {
    await gate;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil: 'commit'});
    await expect(page.locator('.lh-hero-copy')).toBeVisible();
    await expect(page.locator('html')).toHaveCSS('overflow-y', 'hidden');
    await page.mouse.wheel(0, 800);
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    release();
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true', {timeout: 15000});
    await page.mouse.wheel(0, 600);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  } finally {release();}
});


test('a visitor with scripts disabled can still scroll the static document', async ({browser, baseURL}) => {
  const context = await browser.newContext({baseURL, javaScriptEnabled: false, viewport:{width:1440,height:900}});
  try {
    const page = await context.newPage();
    await page.goto('/zh-hant');
    await expect(page.locator('.lh-hero-copy')).toBeVisible();
    await page.mouse.wheel(0, 700);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  } finally {await context.close();}
});
