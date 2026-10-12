import { chromium, firefox, webkit } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

// Catches fixed page backgrounds painting over the real footer even when
// its DOM, layout, visibility and hit testing all report it as visible.
const base = process.env.SITE_URL || 'http://localhost:4226';
const out = process.env.QA_OUTPUT || '/private/tmp/lumiq-footer-20261012';
const native = process.env.SAFARI_SESSION;
const routes = process.env.FOCUSED ? ['/products'] : ['', '/products', '/products/ola', '/products/ola-go', '/products/tablet', '/products/print', '/products/nest', '/products/book', '/products/pal', '/story', '/about', '/plans', '/faq', '/prelaunch', '/contact', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/child-safety', '/members'];
const locales = process.env.FOCUSED ? ['zh-hant'] : ['en', 'zh-hant', 'ja'];
const extraRoutes = ['', '/products', '/products/tablet', '/story', '/plans', '/faq', '/members'];
const extraSizes = [{ width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 2435, height: 498 }, { width: 3440, height: 1440 }];
const reports = [], failures = [];
await fs.mkdir(out, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const measure = `const footer=document.querySelector('footer.footer'),r=footer.getBoundingClientRect();return {rect:r.toJSON(),width:innerWidth,height:innerHeight,visible:getComputedStyle(footer).visibility==='visible'&&getComputedStyle(footer).opacity==='1',overflow:document.documentElement.scrollWidth>innerWidth+1,links:footer.querySelectorAll('a').length,atBottom:Math.abs(document.documentElement.scrollHeight-scrollY-innerHeight)<2};`;
async function paintedPixels(normal, hidden, state) {
  const metadata = await sharp(normal).metadata();
  const scale = metadata.width / state.width;
  const top = Math.ceil(Math.max(100, state.rect.top) * scale);
  const bottom = Math.floor(Math.min(state.height, state.rect.bottom) * scale);
  assert.ok(bottom > top, 'Footer must occupy the viewport at the end of the page');
  const region = { left: 0, top, width: metadata.width, height: bottom - top };
  const a = await sharp(normal).extract(region).removeAlpha().raw().toBuffer();
  const b = await sharp(hidden).extract(region).removeAlpha().raw().toBuffer();
  let changed = 0;
  for (let i = 0; i < a.length; i += 3) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) changed++;
  return changed;
}
async function test(browser, api, locale, route, viewport) {
  const key = `${browser}-${locale}-${route.replaceAll('/', '-') || 'home'}-${viewport.width}x${viewport.height}`;
  try {
    await api.open(`${base}/${locale}${route}`);
    await api.resize(viewport);
    await api.ready(route);
    // Lazy media and responsive images can change the document height after
    // navigation. Wait for the bottom to settle instead of sampling mid-load.
    for (let attempt = 0; attempt < 20; attempt++) {
      await api.js(`scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'})`);
      await delay(200);
      if ((await api.js(measure)).atBottom) break;
    }
    const state = await api.js(measure);
    const normal = await api.screenshot();
    let hidden;
    try {
      await api.js(`const s=document.createElement('style');s.id='footer-paint-test';s.textContent='footer.footer .foot-grid,footer.footer .foot-bottom { visibility:hidden!important; }';document.head.append(s);`);
      // Native Safari screenshots may reuse a composited frame immediately
      // after a style change. Give its renderer a paint before comparison.
      await delay(300);
      hidden = await api.screenshot();
    } finally {
      await api.js(`document.querySelector('#footer-paint-test')?.remove()`);
      await delay(300);
    }
    const pixels = await paintedPixels(normal, hidden, state);
    const item = { browser, locale, route, viewport, ...state, contentPixels: pixels };
    reports.push(item);
    if (pixels <= 300 || !state.visible || state.overflow || !state.atBottom || state.links < 10) {
      await fs.writeFile(`${out}/${key}-failed.png`, normal);
      throw Error(`Footer content must actually paint: ${JSON.stringify(item)}`);
    }
    if (locale === 'zh-hant' && viewport.width === 1440 && ['', '/products', '/products/tablet', '/story', '/members'].includes(route)) await fs.writeFile(`${out}/${key}-after.png`, normal);
    console.log(`PASS ${key}: ${pixels} visible footer content pixels`);
  } catch (e) { failures.push({ key, error: e.message }); console.log(`FAIL ${key}: ${e.message}`); }
}
async function run(browser, api) {
  for (const locale of locales) for (const route of routes) await test(browser, api, locale, route, { width: 1440, height: 1000 });
  if (!process.env.FOCUSED) for (const route of extraRoutes) for (const viewport of extraSizes) await test(browser, api, 'zh-hant', route, viewport);
}
if (native) {
  const driver = process.env.SAFARI_DRIVER || 'http://localhost:9235';
  async function call(path, body, method = 'POST') {
    const r = await fetch(`${driver}/session/${native}/${path}`, { method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const value = (await r.json()).value;
    if (value?.error) throw Error(value.message || value.error);
    return value;
  }
  const js = script => call('execute/sync', { script, args: [] });
  await run('native-safari', {
    js,
    open: url => call('url', { url }),
    resize: size => call('window/rect', size),
    screenshot: async () => Buffer.from(await call('screenshot', undefined, 'GET'), 'base64'),
    ready: async route => {
      const deadline = Date.now() + 40000;
      while (!await js(`return !!document.querySelector('footer.footer')&&${route === '' ? `document.querySelector('.lh-home')?.dataset.homeState==='open'` : 'true'}`)) { if (Date.now() > deadline) throw Error('Page footer readiness timed out'); await delay(100); }
      await delay(800);
    },
  });
} else {
  for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await type.launch();
    const page = await browser.newPage();
    try {
      await run(name, {
        js: script => page.evaluate(`(() => { ${script} })()`),
        open: url => page.goto(url, { waitUntil: 'load' }),
        resize: size => page.setViewportSize(size),
        screenshot: () => page.screenshot(),
        ready: async route => { if (!route) await page.waitForFunction(() => document.querySelector('.lh-home')?.dataset.homeState === 'open', null, { timeout: 40000 }); await page.evaluate(() => document.fonts.ready); },
      });
    } finally { await browser.close(); }
  }
}
await fs.writeFile(`${out}/${native ? 'native' : 'engines'}-footer-report.json`, JSON.stringify({ reports, failures }, null, 2));
assert.deepEqual(failures, []);
