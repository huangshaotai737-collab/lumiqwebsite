import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4211/en');
  await page.waitForFunction(() => document.querySelector('[data-home-state="open"]'), { timeout: 60000 });
  const video = page.locator('.lh-opening-video');
  const move = async y => {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
    await page.waitForTimeout(700);
    return video.evaluate(v => ({ time: v.currentTime, paused: v.paused, progress: Number(v.dataset.scrollProgress), duration: v.duration }));
  };
  await move(0);
  await page.mouse.wheel(0, 180);
  await page.waitForTimeout(800);
  const first = await video.evaluate(v => v.currentTime);
  assert.ok(first > 0 && first < .6, 'small scroll advances less than 0.6 seconds');
  await page.waitForTimeout(800);
  assert.ok(Math.abs(await video.evaluate(v => v.currentTime) - first) < .05, 'stopping scroll freezes movie');
  const middle = await move(1350);
  assert.ok(middle.paused && middle.time > first);
  assert.ok(Math.abs(middle.time - middle.progress * (middle.duration - 1/30)) < .1, 'video follows scroll progress');
  const back = await move(120);
  assert.ok(back.time < middle.time, 'reverse scrolling reverses movie');
  const end = await move(2625);
  assert.ok(end.time > end.duration - .15, 'second screen reaches final frame');
  await page.screenshot({ path: '/tmp/lumiq-opening-scrub-end.png' });
  console.log('PASS: partial wheel, stationary freeze, progress sync, reverse scrub, final frame');
} finally { await browser.close(); }
