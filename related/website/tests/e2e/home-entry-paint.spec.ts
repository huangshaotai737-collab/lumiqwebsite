import {expect, test} from '@playwright/test';
import {createServer, request as proxyRequest, type ServerResponse} from 'node:http';

for (const width of [1440, 390]) {
  test(`${width}px cached entry paints the entire logo and progress before opening`, async ({page}) => {
    await page.setViewportSize({width, height:900});
    await page.addInitScript(() => {
      HTMLImageElement.prototype.decode = () => Promise.resolve();
      const originalFetch = window.fetch;
      window.fetch = (input, init) => /(?:ola-scroll-v16-scrub|pearl-flow-scroll)\.mp4$/.test(String(input))
        ? Promise.resolve(new Response(new Blob(['cached movie'], {type:'video/mp4'})))
        : originalFetch(input, init);
      const state = window as typeof window & {introPainted: boolean; enteredAfterIntro: boolean};
      state.introPainted = false;
      state.enteredAfterIntro = false;
      const sample = () => {
        const loader = document.querySelector<HTMLElement>('.lh-loader');
        if (loader?.dataset.state === 'hidden') {
          state.enteredAfterIntro = state.introPainted;
          return;
        }
        if (loader && document.querySelector('.lh-loader-wordmark')?.getAttribute('data-ready') === 'true') {
          const parts = [...loader.querySelectorAll('.lh-loader-letter, .lh-loader-progress')];
          state.introPainted ||= parts.length === 13 && parts.every(part =>
            Number(getComputedStyle(part).opacity) === 1 && part.getAnimations().every(animation => animation.playState === 'finished'));
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
    await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
    await expect.poll(() => page.evaluate(() => (window as typeof window & {enteredAfterIntro:boolean}).enteredAfterIntro)).toBe(true);
  });
}

test('streamed home hides the shell before the loading component arrives', async ({page, request, baseURL}) => {
  const response = await request.get('/zh-hant');
  const html = await response.text();
  const cutoff = html.indexOf('<div class="lh-loader"');
  expect(cutoff).toBeGreaterThan(0);
  let pending: ServerResponse | undefined;
  const server = createServer((incoming, outgoing) => {
    if (incoming.url === '/zh-hant') {
      outgoing.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
      outgoing.write(html.slice(0, cutoff));
      pending = outgoing;
      return;
    }
    const upstream = proxyRequest(new URL(incoming.url!, baseURL), upstreamResponse => {
      outgoing.writeHead(upstreamResponse.statusCode!, upstreamResponse.headers);
      upstreamResponse.pipe(outgoing);
    });
    incoming.pipe(upstream);
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const {port} = server.address() as {port:number};
  try {
    await page.goto(`http://127.0.0.1:${port}/zh-hant`, {waitUntil:'commit'});
    await page.locator('.site-nav').waitFor({state:'attached'});
    await page.waitForFunction(() => [...document.styleSheets].some(sheet => {
      try {return [...sheet.cssRules].some(rule => rule.cssText.includes('lh-loader'));} catch {return false;}
    }));
    await expect(page.locator('.site-nav')).toBeHidden();
    await expect(page.locator('.lh-loader')).toHaveCount(0);
    if (await page.locator('.lh-home').count()) await expect(page.locator('.lh-home')).toBeHidden();
    pending!.end(html.slice(cutoff));
    await expect(page.locator('.lh-home')).toHaveAttribute('data-home-state', 'open');
    await expect(page.locator('.site-nav')).toBeVisible();
  } finally {
    pending?.end();
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});

test('a delayed logo keeps both entry animations paused until the artwork is decoded', async ({page}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {releaseLogo: Array<() => void>};
    state.releaseLogo = [];
    HTMLImageElement.prototype.decode = function () {
      return this.src.endsWith('/assets/brand/lumiq-logo-transparent-dark.png')
        ? new Promise<void>(resolve => state.releaseLogo.push(resolve)) : Promise.resolve();
    };
    const originalFetch = window.fetch;
    window.fetch = (input, init) => /(?:ola-scroll-v16-scrub|pearl-flow-scroll)\.mp4$/.test(String(input))
      ? Promise.resolve(new Response(new Blob(['cached movie'], {type:'video/mp4'})))
      : originalFetch(input, init);
  });
  await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => (window as typeof window & {releaseLogo:Array<() => void>}).releaseLogo.length === 2);
  await page.waitForTimeout(900);
  await expect(page.locator('.lh-home')).toBeHidden();
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'loading');
  await expect(page.locator('.lh-loader-progress')).toHaveCSS('opacity', '0');
  await page.evaluate(() => (window as typeof window & {releaseLogo:Array<() => void>}).releaseLogo.forEach(resolve => resolve()));
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  await expect(page.locator('.lh-home')).toBeVisible();
});

test('a failed full logo can be retried without leaving the loading page stuck', async ({page}) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = (input, init) => /(?:ola-scroll-v16-scrub|pearl-flow-scroll)\.mp4$/.test(String(input))
      ? Promise.resolve(new Response(new Blob(['cached movie'], {type:'video/mp4'})))
      : originalFetch(input, init);
  });
  let failed = true;
  await page.route('**/assets/brand/lumiq-logo-transparent-dark.png', route => failed
    ? route.fulfill({status:503, body:'logo temporarily unavailable'}) : route.continue());
  await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'error');
  failed = false;
  await page.locator('.lh-loader-actions button').click();
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  await expect(page.locator('.lh-home')).toBeVisible();
});

test('reduced motion enters with the complete static logo and progress', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
  await expect(page.locator('.lh-loader-wordmark')).toHaveAttribute('data-ready', 'true');
  await expect(page.locator('.lh-home')).toBeVisible();
});

test('the shell remains accessible without JavaScript and other routes do not inherit the entry cover', async ({browser, baseURL}) => {
  const context = await browser.newContext({javaScriptEnabled:false, baseURL});
  const page = await context.newPage();
  try {
    await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
    await expect(page.locator('.lh-home')).toBeVisible();
    await expect(page.locator('.site-nav')).toBeVisible();
    await expect(page.locator('.lh-loader')).toBeHidden();
    expect(await page.locator('.lumiq-root').evaluate(element => getComputedStyle(element, '::after').display)).toBe('none');
    await page.goto('/zh-hant/products', {waitUntil:'domcontentloaded'});
    await expect(page.locator('.site-nav')).toBeVisible();
    await expect(page.locator('[data-home-entry]')).toHaveCount(0);
  } finally {await context.close();}
});
