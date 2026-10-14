import {expect, test, type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';

async function ready(page: Page, route: string) {
  await page.goto(route, {waitUntil: 'domcontentloaded'});
  await page.locator('.cart-nav-trigger:not(:disabled)').waitFor();
}

test('phone subscriptions use readable rows, prominent prices and a bounded card width', async ({page}) => {
  for (const locale of ['zh-hant', 'en', 'ja']) {
    for (const width of [320, 390, 640, 767]) {
      await page.setViewportSize({width, height: 900});
      await ready(page, `/${locale}/plans`);
      const cards = page.locator('.pal-cards .tier-card');
      await expect(cards).toHaveCount(7);
      const result = await cards.evaluateAll(items => items.map(e => {
        const box = e.getBoundingClientRect();
        return {width: box.width, rows: [...e.querySelectorAll('li')].map(row => {
          const r = row.getBoundingClientRect();
          return {size: parseFloat(getComputedStyle(row).fontSize), fits: r.left >= box.left && r.right <= box.right};
        })};
      }));
      expect(result.every(x => x.width <= 460 && x.rows.every(r => r.size >= 16 && r.fits))).toBe(true);
      expect(await page.locator('.tier-card .fee-cell strong').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(28);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  }
});

test('the phone OLA portrait has no abrupt colour step at either side', async ({page}) => {
  await page.setViewportSize({width: 640, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await ready(page, '/zh-hant');
  const art = page.locator('.lh-mobile-ola-art');
  await art.scrollIntoViewIfNeeded();
  await expect.poll(() => art.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  const r = (await art.boundingBox())!;
  for (const x of [r.x, r.x + r.width]) {
    for (const fraction of [.3, .48, .7]) {
      const png = await page.screenshot({clip: {x: x - 2, y: r.y + r.height * fraction, width: 4, height: 1}, scale: 'css'});
      const rgb = await sharp(png).removeAlpha().raw().toBuffer();
      const jump = Math.max(...[0, 1, 2].map(channel => Math.abs(rgb[3 + channel] - rgb[6 + channel])));
      expect(jump).toBeLessThanOrEqual(3);
    }
  }
});

test('phone product arrows flank the middle of the cards and still turn all five products', async ({page}) => {
  for (const width of [320, 390, 500, 767]) {
    await page.setViewportSize({width, height: 900});
    await ready(page, '/zh-hant');
    await page.locator('#products').scrollIntoViewIfNeeded();
    await expect(page.locator('#products')).toHaveAttribute('data-enhanced', 'true');
    const rail = (await page.locator('.lh-products-viewport').boundingBox())!;
    const previous = page.locator('[data-products-previous]'), next = page.locator('[data-products-next]');
    const left = (await previous.boundingBox())!, right = (await next.boundingBox())!;
    expect(Math.abs(left.y + left.height / 2 - (rail.y + rail.height / 2))).toBeLessThan(24);
    expect(left.width).toBeGreaterThanOrEqual(44);
    expect(right.x - left.x).toBeGreaterThan(width * .4);
    expect(left.x).toBeGreaterThan(20);
    expect(right.x + right.width).toBeLessThan(width - 20);
    for (let step = 1; step <= 5; step++) {
      await next.click();
      await expect(page.locator('#products')).toHaveAttribute('data-active-product', String(step % 5));
      await page.waitForTimeout(700);
    }
    await previous.click();
    await expect(page.locator('#products')).toHaveAttribute('data-active-product', '4');
  }
});

test('phone reading copy and captions are legible and the opening headline has more presence', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await ready(page, '/zh-hant');
  const sizes = await page.evaluate(() => {
    const size = (s: string) => parseFloat(getComputedStyle(document.querySelector(s)!).fontSize);
    return {hero: size('#hero-title'), body: size('.lh-hero .lh-lead'), label: size('.lh-ola-copy .lh-eyebrow'), consent: size('.lh-consent'), card: size('.lh-product-copy p')};
  });
  expect(sizes.hero).toBeGreaterThanOrEqual(38);
  expect(sizes.body).toBeGreaterThanOrEqual(16);
  expect(sizes.label).toBeGreaterThanOrEqual(14);
  expect(sizes.consent).toBeGreaterThanOrEqual(14);
  expect(sizes.card).toBeGreaterThanOrEqual(16);
});

test('desktop product controls keep their behaviour and selection through a phone resize', async ({page}) => {
  for (const locale of ['zh-hant', 'en', 'ja']) {
    await page.setViewportSize({width: 1440, height: 900});
    await ready(page, `/${locale}`);
    const products = page.locator('#products');
    await products.scrollIntoViewIfNeeded();
    await expect(products).toHaveAttribute('data-carousel', 'true');
    for (let step = 1; step <= 5; step++) {
      await page.locator('[data-products-next]').click();
      await expect(products).toHaveAttribute('data-active-product', String(step % 5));
    }
    await page.setViewportSize({width: 390, height: 844});
    await expect(products).toHaveAttribute('data-carousel', 'false');
    await page.locator('[data-products-previous]').click();
    await expect(products).toHaveAttribute('data-active-product', '4');
    await page.setViewportSize({width: 1440, height: 900});
    await expect(products).toHaveAttribute('data-carousel', 'true');
    await expect(products).toHaveAttribute('data-active-product', '4');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('desktop and tablet styling matches the snapshot taken before the phone refinements', async ({page, browserName}) => {
  test.skip(browserName !== 'chromium', 'The preserved snapshot was measured with Chrome; compare using the same engine.');
  const file = process.env.LUMIQ_DESKTOP_SNAPSHOT;
  test.skip(!file, 'Provide a snapshot from the version being preserved.');
  await page.emulateMedia({reducedMotion: 'reduce'});
  const snapshots = JSON.parse(readFileSync(file!, 'utf8'));
  for (const snapshot of snapshots) {
    await page.setViewportSize({width: snapshot.width, height: 900});
    await ready(page, `/zh-hant${snapshot.route}`);
    await page.waitForFunction(() => document.fonts.status === 'loaded');
    const styles = await page.evaluate((selectors: string[]) => selectors.map(selector => {
      const c = getComputedStyle(document.querySelector(selector)!);
      return {selector, width: c.width, height: c.height, size: c.fontSize, line: c.lineHeight, padding: c.padding, gap: c.gap, display: c.display, position: c.position, columns: c.gridTemplateColumns, transform: c.transform};
    }), snapshot.styles.map((s: {selector: string}) => s.selector));
    expect(styles).toEqual(snapshot.styles);
  }
});
