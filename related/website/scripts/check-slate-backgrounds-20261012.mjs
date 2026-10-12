import { chromium, firefox, webkit } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.env.SITE_URL || 'http://localhost:4222';
const out = 'qa/slate-safari-20261012';
await mkdir(out, { recursive: true });
const results = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  const page = await browser.newPage();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['products/tablet', 'products/ola', 'products/ola-go', 'products/print', 'products/nest', 'members', 'story', 'plans', 'faq', 'products']) {
      const response = await page.goto(`${base}/zh-hant/${route}`);
      assert.equal(response.status(), 200, route);
      await page.waitForTimeout(250);
      const snapshots = [];
      for (const y of [0, 600, 1200, 300, 0]) {
        await page.evaluate(y => window.scrollTo({ top: y, behavior: 'instant' }), y);
        await page.waitForTimeout(80);
        snapshots.push(await page.locator('main').first().evaluate(el => {
          const s = getComputedStyle(el, '::before');
          return { position: s.position, top: s.top, left: s.left, height: s.height,
            image: s.backgroundImage, transform: s.transform,
            overflow: document.documentElement.scrollWidth - innerWidth };
        }));
      }
      for (const s of snapshots) {
        assert.equal(s.position, 'fixed', `${engine} ${route}`);
        assert.equal(s.top, '0px');
        assert(s.overflow <= 1, `${route} overflow ${s.overflow}`);
        assert.deepEqual(s, snapshots[0], `${route} background changed on reverse scroll`);
      }
      if (route.startsWith('products/')) assert(snapshots[0].image.includes('product-detail.png'));
      if (route === 'members') assert(snapshots[0].image.includes('members.png'));
      results.push({ engine, width, route, checks: 'fixed layer unchanged across forward/reverse scroll; no horizontal overflow' });
      if (engine === 'webkit' && ['products/tablet', 'members'].includes(route)) {
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${out}/${engine}-${width}-${route.replaceAll('/', '-')}-final.png` });
      }
    }
  }
  await browser.close();
}
await writeFile(`${out}/background-checks.json`, JSON.stringify(results, null, 2));
console.log(`PASS ${results.length} browser/viewport/page cases`);
