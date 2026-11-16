import {expect, test, type Page} from '@playwright/test';

async function ready(page: Page, path: string) {
  await page.goto(path, {waitUntil: 'domcontentloaded'});
  await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
}

test('phone navigation keeps its waitlist label on one line in all languages', async ({page}) => {
  for (const locale of ['zh-hant', 'en', 'ja']) {
    for (const width of [320, 390, 767]) {
      await page.setViewportSize({width, height: 844});
      await ready(page, `/${locale}/members`);
      const result = await page.locator('.site-login-btn').evaluate(e => {
        const c = getComputedStyle(e), r = e.getBoundingClientRect();
        const text = document.createRange(); text.selectNodeContents(e);
        return {height: text.getBoundingClientRect().height, line: parseFloat(c.lineHeight), left: r.left, right: r.right, size: parseFloat(c.fontSize)};
      });
      expect(result.height).toBeLessThanOrEqual(result.line + 2);
      expect(result.size).toBeLessThanOrEqual(14);
      expect(result.left).toBeGreaterThan(0);
      expect(result.right).toBeLessThan(width);
    }
  }
});

test('the phone footer is compact, expands every group and preserves desktop navigation', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant/members');
  const footer = page.locator('.footer');
  await footer.scrollIntoViewIfNeeded();
  const groups = footer.locator('.foot-mobile-nav details');
  await expect(groups).toHaveCount(4);
  expect((await footer.boundingBox())!.height).toBeLessThan(420);
  for (let i = 0; i < 4; i++) {
    await groups.nth(i).locator('summary').click();
    await expect(groups.nth(i)).toHaveAttribute('open', '');
  }
  await expect(groups.first().locator('a')).toHaveCount(6);
  await expect(groups.nth(2).locator('a')).toHaveCount(4);
  await groups.first().locator('a').last().click();
  await expect(page).toHaveURL(/\/zh-hant\/plans$/);
  for (const width of [768, 1440]) {
    await page.setViewportSize({width, height: 900});
    await expect(page.locator('.foot-mobile-nav')).toBeHidden();
    await expect(page.locator('.footer .foot-nav')).toHaveCount(4);
    for (const column of await page.locator('.footer .foot-nav').all()) await expect(column).toBeVisible();
  }
});

test('second chapter copy never shares the phone product artwork area', async ({page}) => {
  for (const locale of ['zh-hant', 'en', 'ja']) {
    for (const width of [320, 390, 767]) {
      await page.setViewportSize({width, height: 844});
      await ready(page, `/${locale}`);
      const fits = await page.locator('.lh-ola-layout').evaluate(e => {
        const copy = e.querySelector('.lh-ola-copy')!.getBoundingClientRect();
        const art = e.querySelector('.lh-mobile-ola-art')!.getBoundingClientRect();
        const cards = e.querySelector('.lh-rhythm-cards')!.getBoundingClientRect();
        return copy.bottom <= art.top && art.bottom <= cards.top;
      });
      expect(fits).toBe(true);
    }
  }
});

test('phone product catalog keeps all five destinations in a compact layout', async ({page}) => {
  for (const locale of ['zh-hant', 'en', 'ja']) {
    for (const width of [320, 390, 767]) {
      await page.setViewportSize({width, height: 844});
      await ready(page, `/${locale}/products`);
      const grid = page.locator('.prod-catalog-grid');
      const links = grid.locator('a.prod-catalog-card');
      await expect(links).toHaveCount(5);
      const height = (await grid.boundingBox())!.height;
      expect(height).toBeLessThan(1500);
      for (const link of await links.all()) {
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeInViewport({ratio: .8});
        const fits = await link.evaluate(e => {
          const r = e.getBoundingClientRect(), text = e.querySelector('.prod-catalog-caption')!.getBoundingClientRect();
          return text.left >= r.left && text.right <= r.right && text.bottom <= r.bottom;
        });
        expect(fits).toBe(true);
      }
    }
  }
});

test('mobile type has supporting, reading and heading levels while inputs stay readable', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant/members');
  const sizes = await page.evaluate(() => {
    const size = (s: string) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
    return {title: size('.members-heading h1'), body: size('.members-heading p:not(.members-eyebrow)'), note: size('.members-disclosure'), button: size('.members-sidebar button')};
  });
  expect(sizes.title).toBeGreaterThan(sizes.body);
  expect(sizes.title).toBeLessThanOrEqual(30);
  expect(sizes.body).toBeGreaterThanOrEqual(14);
  expect(sizes.note).toBeLessThan(sizes.body);
  expect(sizes.note).toBeGreaterThanOrEqual(12);
  expect(sizes.button).toBeLessThanOrEqual(14);
  await page.locator('.members-sidebar button').last().click();
  expect(await page.locator('.members-panel input[maxlength="60"]').evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
});

test('phone opening copy and lower sections are readable on their first scroll frame', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await ready(page, '/zh-hant');
  const heading = page.locator('.lh-ola-copy h2');
  await expect(heading).not.toHaveAttribute('data-scroll-reveal', 'pending');
  await heading.evaluate(e => window.scrollTo({top: scrollY + e.getBoundingClientRect().top - 280, behavior: 'instant'}));
  expect(await heading.evaluate(e => getComputedStyle(e).opacity)).toBe('1');
  expect(await heading.evaluate(e => e.getAnimations().length)).toBe(0);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('[data-scroll-reveal="pending"]')).toHaveCount(0);
  await page.emulateMedia({reducedMotion: 'no-preference'});
  const lower = page.locator('.lh-safety-copy h2');
  await expect(lower).not.toHaveAttribute('data-scroll-reveal', 'pending');
  await lower.evaluate(e => window.scrollTo({top: scrollY + e.getBoundingClientRect().top - 280, behavior: 'instant'}));
  expect(await lower.evaluate(e => getComputedStyle(e).opacity)).toBe('1');
  expect(await lower.evaluate(e => e.getAnimations().length)).toBe(0);
  await page.setViewportSize({width: 1440, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect(page.locator('[data-scroll-reveal="pending"]')).toHaveCount(0);
});
