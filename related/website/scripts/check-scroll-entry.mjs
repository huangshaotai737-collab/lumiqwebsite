import {chromium, firefox, webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.SITE_URL || 'http://127.0.0.1:4211';
const output = process.env.QA_OUTPUT || '/private/tmp/lumiq-scroll-entry';
const locale = process.env.LOCALE || 'zh-hant';
const routes = [
  {path: '', targets: ['.lh-ola-copy h2', '.lh-products-heading h2', '.lh-films-heading h2', '.lh-room-heading h2', '.lh-safety-copy h2', '.lh-family-heading h2', '.lh-join-copy h2']},
  {path: '/products', targets: ['.prod-hero-text h1', '.prod-lineup-head h2', '.prod-promise-item strong']},
  {path: '/story', targets: ['.story-hero-copy h1', '.story-origin-copy p', '.story-section-head h2', '.story-principle h3', '.story-future-copy h2']},
  {path: '/plans', targets: ['.plans-intro h1', '.plans-hardware h2']},
  {path: '/products/ola', targets: ['.pd-hero-copy h1', '.pd-hero-visual', '.pd-story-copy h2', '.pd-scenes-floor h2', '.pd-feature-floor h2']},
  {path: '/products/ola-go', targets: ['.pd-hero-copy h1', '.pd-hero-visual', '.pd-story-copy h2']},
  {path: '/products/tablet', targets: ['.pd-hero-copy h1', '.pd-hero-visual', '.pd-story-copy h2']},
  {path: '/products/print', targets: ['.pd-hero-copy h1', '.pd-hero-visual', '.pd-story-copy h2']},
  {path: '/products/nest', targets: ['.orb-hero h1', '.orb-hero-visual', '.orb-overview h2', '.orb-detail h2', '.orb-finishes h2']},
  {path: '/faq', targets: ['main h1', '.faq-row .faq-q']},
  {path: '/contact', targets: ['main h1', 'main h2']},
  {path: '/about', targets: ['.subpage-hero h1', '.subpage-body h2']},
  {path: '/prelaunch', targets: ['main h1']},
  {path: '/legal/terms', targets: ['.subpage-hero h1', '.subpage-body h2']},
  {path: '/legal/privacy', targets: ['.subpage-hero h1', '.subpage-body h2']},
  {path: '/legal/cookies', targets: ['.subpage-hero h1', '.subpage-body h2']},
  {path: '/legal/child-safety', targets: ['.subpage-hero h1', '.subpage-body h2']},
  {path: '/login', targets: ['main h1']},
  {path: '/register', targets: ['main h1']},
  {path: '/reset-password', targets: ['main h1']},
];
const commonViewports = [
  {width: 390, height: 844},
  {width: 768, height: 1024},
  {width: 1440, height: 900},
];
const chromiumEdges = [
  {width: 320, height: 740},
  {width: 1024, height: 768},
  {width: 1920, height: 1080},
];
const engines = {chromium, firefox, webkit};
const selected = process.env.ENGINE ? [process.env.ENGINE] : Object.keys(engines);
await fs.mkdir(output, {recursive: true});
const results = [];
const failures = [];

for (const engine of selected) {
  assert.ok(engines[engine], `Unknown browser engine: ${engine}`);
  const browser = await engines[engine].launch();
  try {
    const viewports = engine === 'chromium' && process.env.EDGES !== 'false' ? [...commonViewports, ...chromiumEdges] : commonViewports;
    for (const viewport of viewports) {
      const page = await browser.newPage({viewport, reducedMotion: 'no-preference'});
      try {
        for (const route of routes) {
          const record = {engine, locale, viewport, path: route.path || '/', targets: []};
          try {
            const response = await page.goto(`${base}/${locale}${route.path}`, {waitUntil: 'domcontentloaded', timeout: 30000});
            assert.equal(response?.status(), 200, 'page response');
            await page.locator('main').first().waitFor({state: 'attached'});
            if (!route.path) {
              assert.equal(await page.locator('img[data-home-image][src^="data:image/gif"]').count(), 0,
                'home artwork must not start from a transparent pixel');
            }
            for (const selector of route.targets) {
              // The desktop Ola copy is deliberately tied to the opening film's
              // presented frame; it is not a lower-page scroll-reveal.
              if (!route.path && selector === '.lh-ola-copy h2' && viewport.width >= 1200) continue;
              const firstFrame = await page.evaluate((target) => {
                const element = document.querySelector(target);
                if (!element) return {missing: true};
                element.scrollIntoView({block: 'center', behavior: 'instant'});
                let opacity = 1;
                let node = element;
                while (node && node !== document.body) {
                  const style = getComputedStyle(node);
                  opacity *= Number(style.opacity);
                  if (style.visibility === 'hidden' || style.display === 'none') opacity = 0;
                  node = node.parentElement;
                }
                const rect = element.getBoundingClientRect();
                return {
                  opacity, visibleInViewport: rect.top < innerHeight && rect.bottom > 0,
                  pendingText: document.querySelectorAll('[data-scroll-reveal="pending"]').length,
                  pendingBlocks: document.querySelectorAll('[data-reveal-pending]').length,
                  ownAnimations: element.getAnimations().filter(animation => animation.playState === 'running').length,
                  horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
                };
              }, selector);
              record.targets.push({selector, ...firstFrame});
              assert.ok(!firstFrame.missing, `missing ${selector}`);
              assert.equal(firstFrame.pendingText, 0, `text staged at ${selector}`);
              assert.equal(firstFrame.pendingBlocks, 0, `block staged at ${selector}`);
              assert.ok(firstFrame.opacity >= .99, `incomplete first frame at ${selector}: ${firstFrame.opacity}`);
              assert.equal(firstFrame.horizontalOverflow, false, `horizontal overflow at ${selector}`);
            }
            results.push(record);
            console.log(`PASS ${engine} ${viewport.width}×${viewport.height} ${record.path}`);
          } catch (error) {
            failures.push({...record, error: error.message});
            console.log(`FAIL ${engine} ${viewport.width}×${viewport.height} ${record.path}: ${error.message}`);
          }
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
}

await fs.writeFile(`${output}/report.json`, JSON.stringify({results, failures}, null, 2));
if (failures.length) throw new Error(`${failures.length} scroll-entry checks failed; see ${output}/report.json`);
