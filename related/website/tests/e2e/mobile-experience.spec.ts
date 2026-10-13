import {expect, test, type Page} from '@playwright/test';

async function ready(page: Page, path: string) {
  await page.goto(path, {waitUntil: 'domcontentloaded'});
  await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
}

test('all five product choices are discoverable without horizontal scrolling', async ({page}) => {
  for (const [locale, width] of [['zh-hant', 320], ['zh-hant', 390], ['en', 430], ['ja', 360]] as const) {
    await page.setViewportSize({width, height: 844});
    await ready(page, `/${locale}/products`);
    const tabs = page.getByRole('tablist');
    await tabs.scrollIntoViewIfNeeded();
    const visibility = await tabs.evaluate(e => {
      const box = e.getBoundingClientRect();
      return [...e.children].map(tab => {
        const r = tab.getBoundingClientRect();
        return r.left >= box.left - 1 && r.right <= box.right + 1;
      });
    });
    expect(visibility).toEqual([true, true, true, true, true]);
    for (const [index, href] of ['/products/ola', '/products/ola-go', '/products/tablet', '/products/print', '/products/nest'].entries()) {
      await tabs.getByRole('tab').nth(index).click();
      await expect(tabs.getByRole('tab').nth(index)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.prod-stage .prod-product-link')).toHaveAttribute('href', `/${locale}${href}`);
      await expect(page.locator('.prod-mobile-nav')).toContainText(`${String(index + 1).padStart(2, '0')} / 05`);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('feature copy has a clear hierarchy and fits narrow screens in every language', async ({page}) => {
  for (const locale of ['zh-hant', 'en', 'ja']) {
    for (const width of [320, 390, 767]) {
      await page.setViewportSize({width, height: 844});
      await ready(page, `/${locale}/products`);
      const features = page.locator('.prod-feat');
      await expect(features).toHaveCount(4);
      const measurements = await features.evaluateAll(items => items.map(e => {
        const box = e.getBoundingClientRect(), title = e.querySelector('strong')!, body = e.querySelector('small')!;
        const r = body.getBoundingClientRect();
        return {titleSize: parseFloat(getComputedStyle(title).fontSize), bodySize: parseFloat(getComputedStyle(body).fontSize), fits: r.left >= box.left && r.right <= box.right + 1, width: box.width, y: box.y};
      }));
      expect(measurements.every(x => x.titleSize > x.bodySize && x.bodySize >= 14 && x.fits)).toBe(true);
      if (width === 320) expect(measurements[0].width).toBeGreaterThan(250);
      else expect(Math.abs(measurements[0].y - measurements[1].y)).toBeLessThan(2);
    }
  }
});

test('a narrow computer window switches stories to mobile controls and preserves the selected story', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page, '/zh-hant');
  await page.locator('.lh-films-controls button').last().click();
  await expect(page.locator('.lh-films-controls strong')).toHaveText('02');
  await page.setViewportSize({width: 390, height: 844});
  await expect(page.locator('.lh-mobile-films-controls')).toContainText('02');
  await expect(page.locator('.lh-mobile-film-card')).toHaveCount(3);
  await page.locator('.lh-mobile-films-controls button').last().click();
  await expect(page.locator('.lh-mobile-films-controls strong')).toHaveText('03');
  await page.setViewportSize({width: 1440, height: 900});
  await expect(page.locator('.lh-films-controls strong')).toHaveText('03');
  await expect(page.locator('.lh-mobile-films')).toHaveCount(0);
});

test('native horizontal story swipes change stories while vertical swipes scroll the page', async ({browser, browserName}) => {
  test.skip(browserName !== 'chromium', 'Native touch injection uses the Chromium debugging protocol.');
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  try {
    await ready(page, `${test.info().project.use.baseURL}/zh-hant`);
    const track = page.locator('.lh-mobile-films-track');
    await track.scrollIntoViewIfNeeded();
    await expect(page.locator('.lh-mobile-films-controls strong')).toHaveText('01');
    const box = (await track.boundingBox())!;
    const y = Math.min(600, Math.max(200, box.y + 80));
    const cdp = await context.newCDPSession(page);
    const swipe = async (x1: number, y1: number, x2: number, y2: number) => {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x1, y: y1}]});
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x1 + (x2 - x1) * i / 10, y: y1 + (y2 - y1) * i / 10}]});
        await page.waitForTimeout(30);
      }
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    };
    await swipe(300, y, 70, y);
    await expect(page.locator('.lh-mobile-films-controls strong')).toHaveText('02');
    const before = await page.evaluate(() => scrollY);
    await swipe(180, 610, 180, 310);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
    await expect(page.locator('.lh-mobile-films-controls strong')).toHaveText('02');
  } finally {
    await context.close();
  }
});

test('desktop and tablet compositions match the preserved version', async ({browser}) => {
  const baseline = process.env.MOBILE_BASELINE_URL;
  test.skip(!baseline, 'Set MOBILE_BASELINE_URL to compare against a preserved preview.');
  const updated = test.info().project.use.baseURL!;
  const page = await browser.newPage();
  const measure = async (origin: string, route: string, selectors: string[]) => {
    await ready(page, origin + route);
    // WebKit can leave the FontFaceSet.ready promise pending even after all
    // requested faces are loaded. Check the observable loading state instead.
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    return page.evaluate(selectors => selectors.map(selector => {
      const e = document.querySelector(selector)!;
      const c = getComputedStyle(e);
      return {selector, width: c.width, height: c.height, fontSize: c.fontSize, columns: c.gridTemplateColumns, direction: c.flexDirection, padding: c.padding, gap: c.gap, display: c.display};
    }), selectors);
  };
  try {
    for (const width of [931, 1440, 1710]) {
      await page.setViewportSize({width, height: 900});
      for (const [route, selectors] of [
        ['/zh-hant', ['#hero-title', '.lh-ola-layout', '.lh-ola-copy h2', '.lh-films-heading h2', '.lh-films-layout', '.lh-films-stage', '.lh-films-controls', '.nav-inner', '.login-btn', '.foot-grid', '.foot-nav', '.foot-nav a']],
        ['/zh-hant/products', ['.prod-feats-grid', '.prod-feat', '.prod-feat strong', '.prod-tabs', '.prod-tab', '.prod-carousel', '.prod-stage-panel', '.prod-catalog-grid', '.prod-catalog-card', '.prod-promise-grid']],
        ['/zh-hant/members', ['.members-heading h1', '.members-disclosure', '.members-sidebar', '.members-content', '.members-section-head h2', '.foot-grid']],
      ] as const) {
        const before = await measure(baseline!, route, [...selectors]);
        const after = await measure(updated, route, [...selectors]);
        expect(after).toEqual(before);
      }
    }
  } finally {
    await page.close();
  }
});

test('only the selected mobile story plays and switching pauses the previous video', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant');
  const track = page.locator('.lh-mobile-films-track');
  await track.scrollIntoViewIfNeeded();
  await expect(track.locator('video')).toHaveCount(1);
  await track.getByRole('button', {name: '播放影片', exact: true}).click();
  await expect.poll(() => track.locator('video').evaluate((e: HTMLVideoElement) => e.currentTime), {timeout: 15000}).toBeGreaterThan(.2);
  const previous = await track.locator('video').elementHandle();
  await page.locator('.lh-mobile-films-controls button').last().click();
  await expect(page.locator('.lh-mobile-films-controls strong')).toHaveText('02');
  expect(await previous!.evaluate((e: HTMLVideoElement) => e.paused)).toBe(true);
  await expect(track.locator('video')).toHaveCount(1);
  expect(await track.locator('video').evaluate((e: HTMLVideoElement) => e.paused)).toBe(true);
});

test('resizing during a desktop story transition keeps the indicated mobile story in view', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await ready(page, '/zh-hant');
  await page.locator('.lh-films-controls button').last().click();
  await page.setViewportSize({width: 390, height: 844});
  await expect(page.locator('.lh-mobile-films-controls strong')).toHaveText('02');
  await expect(page.locator('.lh-mobile-film-card').nth(1)).toBeInViewport({ratio: .8});
});
