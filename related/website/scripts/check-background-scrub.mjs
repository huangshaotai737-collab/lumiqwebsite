import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:4211';
const open = async (options = {}) => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, ...options });
  return page;
};
try {
  const fallback = await open();
  await fallback.route('**/version-5-tail-wave-20260914.mp4', route => route.abort());
  await fallback.goto(`${baseURL}/en`);
  await fallback.waitForTimeout(3000);
  assert.equal(await fallback.locator('[data-background-video]').evaluate(v => v.dataset.ready), 'false');
  assert.equal(await fallback.locator('[data-background-fallback]').evaluate(el => el.style.opacity), '1');
  await fallback.close();
  const reduced = await open({ reducedMotion: 'reduce' });
  await reduced.goto(`${baseURL}/en`);
  await reduced.waitForTimeout(1500);
  assert.equal(await reduced.locator('[data-background-video]').getAttribute('src'), null);
  await reduced.close();
  if (!process.argv.includes('--fallback-only')) {
    const page = await open();
    await page.goto(`${baseURL}/en`);
    await page.waitForSelector('[data-background-video][data-ready="true"]', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(6000);
    const { start, end, duration, cues } = await page.locator('[data-background-video]').evaluate(v => ({
      start: Number(v.dataset.scrollStart), end: Number(v.dataset.scrollEnd), duration: v.duration - 1 / 30, cues: JSON.parse(v.dataset.scrollCues)
    }));
    const at = y => {
      const right = cues.findIndex(([position]) => position > y);
      if (right === 0) return 0;
      if (right < 0) return duration;
      const [a, from] = cues[right - 1], [b, to] = cues[right];
      return Math.min(duration, from + (to - from) * (y - a) / Math.max(1, b - a));
    };
    const positions = [start, start+(end-start)*.5, end];
    assert.equal(end, await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight));
    const bounds = await page.locator('[data-background-video]').boundingBox();
    const nav = await page.locator('.site-nav').boundingBox();
    assert.ok(Math.abs(bounds.y-nav.height)<1 && Math.abs(bounds.height+nav.height-1000)<1, 'video fills visible viewport below navigation only');
    assert.equal(await page.locator('[data-background-video]').evaluate(v=>getComputedStyle(v).objectFit), 'cover');
    assert.equal(await page.locator('[data-chapter-background]').count(), 0, 'old chapter image transitions removed');
    await page.evaluate(() => {
      window.backgroundFlickers = 0;
      const v = document.querySelector('[data-background-video]');
      const check = () => { if (v.dataset.ready !== 'true' || v.style.opacity !== '1') window.backgroundFlickers++; };
      v.addEventListener('seeking', () => { requestAnimationFrame(check); });
    });
    const video = page.locator('[data-background-video]');
    const move = async (y, time) => {
      await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
      await page.waitForFunction(time => {
        const v = document.querySelector('[data-background-video]');
        return !v.seeking && Math.abs(v.currentTime - time) < .15;
      }, time);
      assert(await video.evaluate(v => v.paused), 'background remains paused');
    };
    await move(positions[0], 0);
    assert.equal(await page.locator('[data-background-fallback]').evaluate(el => el.style.opacity), '0');
    await move((positions[0] + positions[1]) / 2, at(start+(end-start)*.25));
    await page.waitForTimeout(500);
    assert(Math.abs(await video.evaluate(v => v.currentTime) - at(start+(end-start)*.25)) < .15, 'stopped scroll freezes frame');
    await move(positions[1], at(positions[1]));
    await move(start+(end-start)*.9, at(start+(end-start)*.9));
    await move(positions[2], duration);
    await move(positions[0], 0);
    assert.equal(await page.locator('[data-background-video]').count(), 1);
    for (let i=0;i<20;i++) {
      await page.evaluate(y=>scrollTo(0,y), positions[0]+(positions[1]-positions[0])*(i%2 ? .7 : .2));
      await page.waitForTimeout(40);
    }
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>window.backgroundFlickers),0,'seek never exposes static fallback');
    await move(positions[0],0);
    await page.screenshot({ path: '/tmp/lumiq-background-products.png' });
    await page.close();

    const mobile = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await mobile.goto(`${baseURL}/en`);
    await mobile.waitForSelector('[data-background-video]', { state: 'attached' });
    assert.equal(await mobile.locator('[data-background-video]').getAttribute('src'), null, 'mobile does not load a parallax video');
    assert.match(await mobile.locator('#products').evaluate(el => getComputedStyle(el, '::before').backgroundImage), /mobile-backgrounds-20260914\/products.webp/);
    await mobile.close();
  }
  console.log('PASS background fallback/reduced-motion' + (process.argv.includes('--fallback-only') ? '' : ', desktop chapter cues/seek/freeze/reverse and mobile static background'));
} finally { await browser.close(); }
