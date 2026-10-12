import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4211';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of (process.env.INTERACTIONS_ONLY ? [] : [320, 360, 390, 430])) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });
    for (const locale of ['en', 'zh-hant', 'ja']) {
      await page.goto(`${base}/${locale}`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.lh-home[data-home-state="open"]', { timeout: 60000 });
      assert.equal(await page.locator('[data-background-video]').getAttribute('src'), null, 'no mobile background video');
      assert.equal(await page.locator('.lh-opening').getAttribute('data-video-mode'), null, 'no mobile opening pin');
      for (const id of ['top', 'ola', 'products', 'films', 'experiences', 'safety', 'family', 'join']) {
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width}/${locale}/${id}: overflow`);
        const background = await page.locator(`#${id}`).evaluate(el => {
          const style = getComputedStyle(el, '::before');
          return { image: style.backgroundImage, mask: style.maskImage, transform: style.transform, height: parseFloat(style.height), sectionHeight: el.getBoundingClientRect().height };
        });
        if (id === 'top' || id === 'ola') {
          assert.equal(await page.locator(`#${id}`).evaluate(el => getComputedStyle(el, '::before').display), 'none', `${id}: no duplicate background`);
          continue;
        }
        assert.match(background.image, /mobile-backgrounds-20260914\//, `${id}: dedicated portrait art`);
        assert.notEqual(background.mask, 'none', `${id}: soft chapter edges`);
        assert.equal(background.transform, 'none', `${id}: no parallax transform`);
        assert(Math.abs(background.height - background.sectionHeight) < 2, `${id}: background covers entire chapter`);
      }
      const heroImage = await page.locator('.lh-mobile-hero-art img').evaluate(img => ({
        ratio: img.naturalWidth / img.naturalHeight,
        boxRatio: img.clientWidth / img.clientHeight,
        fit: getComputedStyle(img).objectFit,
      }));
      assert.equal(heroImage.fit, 'contain');
      assert(Math.abs(heroImage.ratio - 9 / 16) < .02, 'dedicated portrait hero');
      assert.equal(await page.locator('.lh-hero-stage').isVisible(), false, 'no desktop scene overlay');
      assert.equal(await page.locator('.lh-brand-character').isVisible(), false, 'no standalone girl in mobile OLA scene');
      assert(await page.locator('.lh-mobile-ola-art img').evaluate(img => img.complete && img.naturalWidth > 0), 'OLA + detached Go image loaded');
      const clearance = await page.evaluate(() => {
        const art = document.querySelector('.lh-mobile-ola-art img').getBoundingClientRect();
        const copy = document.querySelector('.lh-ola-copy').getBoundingClientRect();
        return art.top + art.height * .40 - copy.bottom;
      });
      assert(clearance >= 0, 'OLA product does not overlap reserved UI area');
      const hero = await page.locator('#hero-title').boundingBox();
      assert(Number.parseFloat(await page.locator('#hero-title').evaluate(el => getComputedStyle(el).fontSize)) <= 42, 'mobile title uses compact type scale');
      assert(hero.x >= 0 && hero.x + hero.width <= width, 'hero title fits');
      const card = await page.locator('.lh-film-card').boundingBox();
      assert(card.x >= 0 && card.x + card.width <= width, 'video fits');
      assert.equal(await page.locator('.lh-film-character').isVisible(), false, 'no mobile character');
      assert(Math.abs(card.x + card.width / 2 - width / 2) < 2, 'mobile video centered');
      const selected = await page.locator('.lh-product-slot[data-active="true"]').boundingBox();
      assert(Math.abs(selected.x + selected.width / 2 - width / 2) < 2, 'selected product centered');
      assert.equal(await page.locator('.lh-products').getAttribute('data-carousel'), 'false');
      console.log(`${width}/${locale}: eight sections fit`);
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const route of ['products', 'products/tablet', 'products/ola', 'products/ola-go', 'products/nest', 'products/print', 'plans', 'story', 'media', 'faq', 'contact', 'about', 'legal/privacy']) {
    const response = await page.goto(`${base}/en/${route}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200, route);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: overflow`);
  }
  await page.goto(`${base}/en`);
  await page.waitForSelector('.lh-home[data-home-state="open"]', { timeout: 60000 });
  await page.locator('.site-mobile-trigger').click();
  assert(await page.locator('.site-mobile-menu').isVisible(), 'menu opens');
  await page.locator('.site-mobile-close').click();
  await page.locator('#products').scrollIntoViewIfNeeded();
  await page.locator('[data-products-next]').click();
  await page.waitForTimeout(900);
  assert.equal(await page.locator('#products').getAttribute('data-active-product'), '1', 'product next button');
  const selectedProduct = await page.locator('.lh-product-slot[data-active="true"]').boundingBox();
  assert(Math.abs(selectedProduct.x + selectedProduct.width / 2 - 195) < 2, 'next product remains centered');
  await page.locator('#films').scrollIntoViewIfNeeded();
  const swipe = async (x, y) => {
    await page.locator('.lh-films-stage').evaluate((target, [x, y]) => {
      const touch = (clientX, clientY) => new Touch({ identifier: 1, target, clientX, clientY });
      target.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [touch(200, 500)] }));
      target.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [touch(x, y)] }));
    }, [x, y]);
    await page.waitForTimeout(900);
  };
  const first = await page.locator('.lh-film-card').getAttribute('aria-label');
  await swipe(205, 350);
  assert.equal(await page.locator('.lh-film-card').getAttribute('aria-label'), first, 'vertical swipe must not switch film');
  await swipe(90, 490);
  assert.notEqual(await page.locator('.lh-film-card').getAttribute('aria-label'), first, 'horizontal swipe switches film');
  await page.locator('.lh-film-toggle').click();
  await page.waitForFunction(() => !document.querySelector('.lh-film-card video').paused);
  await page.locator('.lh-film-toggle').click();
  assert(await page.locator('.lh-film-card video').evaluate(v => v.paused), 'pause is reachable');
  console.log('13 routes, menu, product controls, swipe directions and playback passed');
} finally { await browser.close(); }
