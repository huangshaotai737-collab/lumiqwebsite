import {expect, test, type Page} from '@playwright/test';

async function ready(page: Page, path: string) {
  await page.goto(path, {waitUntil: 'domcontentloaded'});
  await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
}

test('closing the cart after a mobile menu and desktop resize restores page scrolling', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/en/story');
  await page.locator('.site-mobile-trigger').click();
  await expect(page.locator('.site-mobile-menu')).toBeVisible();
  await page.locator('.cart-nav-trigger').click();
  await expect(page.locator('#lumiq-cart')).toBeVisible();
  await page.setViewportSize({width: 1440, height: 900});
  await expect(page.locator('.site-mobile-menu')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('#lumiq-cart')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 350);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 100);
});

test('cart quantity controls remain reachable in a short landscape window', async ({page}) => {
  await page.setViewportSize({width: 844, height: 390});
  await ready(page, '/ja/products/tablet');
  await page.locator('[data-cart-add="tablet"]').first().click();
  const increase = page.locator('[data-cart-product="tablet"] .cart-quantity button').last();
  await increase.scrollIntoViewIfNeeded();
  await expect(increase).toBeInViewport({ratio: .8});
  await increase.click();
  await expect(page.locator('[data-cart-product="tablet"] output')).toHaveText('2');
});

test('the longest allowed member name fits the phone sidebar after saving and reloading', async ({page}) => {
  await page.setViewportSize({width: 320, height: 740});
  await ready(page, '/en/members');
  await page.locator('.members-sidebar button').last().click();
  await page.locator('.members-panel input[maxlength="60"]').fill('A'.repeat(60));
  await page.locator('.members-panel button[type="submit"]').click();
  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.locator('.members-avatar strong')).toHaveText('A'.repeat(60));
  const fits = await page.locator('.members-avatar strong').evaluate(e => {
    const r = e.getBoundingClientRect(), p = e.closest('.members-sidebar')!.getBoundingClientRect();
    return r.left >= p.left && r.right <= p.right + 1 && document.documentElement.scrollWidth <= innerWidth + 1;
  });
  expect(fits).toBe(true);
});

test('mobile menus keep every destination and language reachable in portrait and landscape', async ({page}) => {
  for (const locale of ['en', 'zh-hant', 'ja']) {
    for (const viewport of [{width: 320, height: 740}, {width: 844, height: 390}]) {
      await page.setViewportSize(viewport);
      await ready(page, `/${locale}/story`);
      await page.locator('.site-mobile-trigger').click();
      const menu = page.locator('.site-mobile-menu');
      await expect(menu.getByRole('link')).toHaveCount(6);
      await expect(menu.locator('.site-mobile-languages button')).toHaveCount(3);
      const last = menu.locator('.site-mobile-languages button').last();
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport({ratio: .8});
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(page.locator('.site-mobile-trigger')).toBeFocused();
      await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    }
  }
});

test('cart contents persist, quantities update and removing items restores the empty state', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant/products/tablet');
  await page.locator('[data-cart-add="tablet"]').first().click();
  const cart = page.locator('#lumiq-cart');
  const unitPrice = Number((await cart.locator('.cart-item-price').innerText()).replace(/[^\d.]/g, ''));
  // Approved workbook row 43: Tablet member preview price starts at USD 359.
  expect(unitPrice).toBe(359);
  await cart.locator('.cart-quantity button').last().click();
  await expect(cart.locator('output')).toHaveText('2');
  await expect.poll(async () => Number((await cart.locator('.cart-total strong').innerText()).replace(/[^\d.]/g, ''))).toBe(unitPrice * 2);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await cart.evaluate(e => e.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await page.reload({waitUntil: 'domcontentloaded'});
  await expect(page.locator('.cart-nav-count')).toHaveText('2');
  await page.locator('.cart-nav-trigger').click();
  await cart.locator('.cart-remove').click();
  await expect(cart.locator('.cart-empty')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('waitlist validation and a network failure leave the phone form usable', async ({page}) => {
  await page.setViewportSize({width: 320, height: 740});
  await ready(page, '/zh-hant');
  const form = page.locator('.lh-waitlist form');
  const input = form.locator('input[type="email"]');
  await input.fill('invalid');
  await form.locator('button[type="submit"]').click();
  expect(await input.evaluate((e: HTMLInputElement) => e.validity.valid)).toBe(false);
  await page.route('**/api/waitlist', route => route.abort());
  await input.fill('ui-walkthrough@example.com');
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[role="alert"]')).toBeVisible();
  await expect(input).toBeEnabled();
  await expect(form.locator('button[type="submit"]')).toBeEnabled();
  const fits = await form.evaluate(e => {const r = e.getBoundingClientRect();return r.left >= -1 && r.right <= innerWidth + 1 && e.scrollWidth <= e.clientWidth + 1;});
  expect(fits).toBe(true);
});

test('long Japanese hero actions stay inside the phone viewport', async ({page}) => {
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({width, height: 900});
    await ready(page, '/ja');
    const actions = await page.locator('.lh-hero .lh-actions a').evaluateAll(items => items.map(e => {
      const r = e.getBoundingClientRect();
      return {left: r.left, right: r.right, width: innerWidth};
    }));
    expect(actions.every(r => r.left >= 19 && r.right <= r.width - 19)).toBe(true);
  }
});

test('hardware reservation and detail links do not overlap on narrow Japanese pages', async ({page}) => {
  await page.setViewportSize({width: 320, height: 900});
  await ready(page, '/ja/plans');
  const separated = await page.locator('.hw-actions').evaluateAll(rows => rows.map(row => {
    const links = [...row.querySelectorAll('a')];
    const boxes = links.map(e => {const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect();});
    const [a, b] = boxes;
    return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
  }));
  expect(separated.every(Boolean)).toBe(true);
});

test('FAQ search, clearing and expanded answers stay usable in all phone languages', async ({page}) => {
  await page.setViewportSize({width: 320, height: 740});
  for (const locale of ['en', 'zh-hant', 'ja']) {
    await ready(page, `/${locale}/faq`);
    const search = page.locator('.faq-search input');
    await search.fill('NoMatchingQuestionXYZ');
    await expect(page.locator('.faq-row')).toHaveCount(0);
    await page.locator('.faq-clear').click();
    await expect(search).toHaveValue('');
    await expect(search).toBeFocused();
    // Approved workbook row 149 replaces six questions and adds eleven.
    await expect(page.locator('.faq-row')).toHaveCount(17);
    for (let index = 0; index < 17; index++) {
      const button = page.locator('.faq-q').nth(index);
      if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
      await expect(button).toHaveAttribute('aria-expanded', 'true');
      const answer = page.locator('.faq-a').nth(index);
      await expect.poll(() => answer.evaluate(e => e.scrollHeight - e.clientHeight)).toBeLessThan(2);
      expect(await answer.evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    }
  }
});

test('language switching preserves the product route, query, hash and cart', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/en/products/tablet?qa=walkthrough#product');
  await page.locator('[data-cart-add="tablet"]').first().click();
  await page.keyboard.press('Escape');
  await page.locator('.site-mobile-trigger').click();
  await page.locator('.site-mobile-languages button').last().click();
  await expect(page).toHaveURL(/\/ja\/products\/tablet\?qa=walkthrough#product$/);
  await expect(page.locator('.cart-nav-count')).toHaveText('1');
  await expect(page.locator('.site-mobile-menu')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
});

test('billing switches update the comparison and switching back restores it', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/en/plans');
  const controls = page.locator('.billing-toggle').first();
  const yearly = await page.locator('.pal-table').first().innerText();
  await controls.locator('button').last().click();
  await expect(controls.locator('button').last()).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.locator('.pal-table').first().innerText()).not.toBe(yearly);
  await controls.locator('button').first().click();
  await expect.poll(() => page.locator('.pal-table').first().innerText()).toBe(yearly);
});

test('disabled browser storage does not block browsing or cart controls', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Storage unavailable', 'SecurityError');}}));
  await page.setViewportSize({width: 390, height: 844});
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await ready(page, '/en/products/tablet');
  await page.locator('[data-cart-add="tablet"]').first().click();
  await expect(page.locator('[data-cart-product="tablet"] output')).toHaveText('1');
  await page.keyboard.press('Escape');
  await ready(page, '/en/members');
  await page.locator('.members-sidebar button').last().click();
  await page.locator('.members-panel input[maxlength="60"]').fill('Walkthrough');
  await page.locator('.members-panel button[type="submit"]').click();
  await expect(page.locator('.members-status')).not.toHaveText('');
  expect(errors).toEqual([]);
});

test('family picture swipes preserve vertical page scrolling on phones', async ({browser, browserName}) => {
  test.skip(browserName !== 'chromium', 'Native touch injection uses Chromium.');
  const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
  const page = await context.newPage();
  try {
    await ready(page, `${test.info().project.use.baseURL}/zh-hant`);
    const stage = page.locator('.lh-family-stage');
    await stage.scrollIntoViewIfNeeded();
    const box = (await stage.boundingBox())!;
    const y = Math.min(650, Math.max(200, box.y + box.height / 2));
    const cdp = await context.newCDPSession(page);
    const swipe = async (dx: number, dy: number) => {
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: 195, y}]});
      for (let i = 1; i <= 10; i++) {
        await cdp.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: 195 + dx * i / 10, y: y + dy * i / 10}]});
        await page.waitForTimeout(30);
      }
      await cdp.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
    };
    await swipe(-130, 0);
    await expect(page.locator('.lh-family-chapters')).toHaveAttribute('data-active-family', '1');
    const before = await page.evaluate(() => scrollY);
    await swipe(0, -150);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 50);
    await expect(page.locator('.lh-family-chapters')).toHaveAttribute('data-active-family', '1');
  } finally {await context.close();}
});
