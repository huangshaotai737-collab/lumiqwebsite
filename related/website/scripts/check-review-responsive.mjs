import { chromium, webkit, firefox } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const engine = process.env.ENGINE || 'chromium';
const base = process.env.SITE_URL || 'http://127.0.0.1:4213';
const out = process.env.QA_OUTPUT || 'qa/brand-review-20261009';
await fs.mkdir(out, { recursive: true });
const browser = await ({ chromium, webkit, firefox }[engine]).launch(engine === 'chromium' ? { channel: 'chrome' } : {});
const results = [], failures = [];
const viewports = [{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1100,height:720},{width:1280,height:720},{width:1440,height:1000},{width:2435,height:498},{width:3440,height:1440}];
try {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  for (const locale of ['en', 'zh-hant', 'ja']) {
    for (const path of ['', '/products', '/products/ola', '/products/ola-go', '/products/tablet', '/products/print', '/products/nest', '/story', '/plans', '/faq', '/members']) {
      await page.goto(`${base}/${locale}${path}`, { waitUntil: 'load' });
      await page.waitForTimeout(600);
      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.waitForTimeout(180);
        const state = await page.evaluate(() => {
          const rect = e => { const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,right:b.right,bottom:b.bottom,width:b.width,height:b.height}; };
          const intersect=(a,b)=>Math.min(a.right,b.right)>Math.max(a.x,b.x)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+1;
          const visible=e=>e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
          const nav=document.querySelector('.site-nav'), desktop=document.querySelector('.site-desktop-nav');
          const navBox=rect(nav), links=[...desktop.querySelectorAll('a')];
          const navOverflow=visible(desktop)&&links.some(e=>rect(e).right>navBox.right-4||rect(e).x<navBox.x);
          const blocks=[...document.querySelectorAll('.pd-product-tagline,.pd-hero-lede,.pd-concept-note,.pd-hero-display-title')].filter(visible).map(rect);
          const copyOverlap=blocks.some((a,i)=>blocks.slice(i+1).some(b=>intersect(a,b)));
          const footer=[...document.querySelectorAll('.foot-grid > div')].map(rect);
          const footerOverlap=footer.some((a,i)=>footer.slice(i+1).some(b=>intersect(a,b)));
          return {overflow:document.documentElement.scrollWidth>innerWidth+1,navOverflow,copyOverlap,footerOverlap,nav:{width:navBox.width,height:navBox.height},legacy:document.querySelectorAll('.lh-glass-word,.lh-hero-object,.lh-brand-character').length};
        });
        const entry={engine,locale,path,viewport,...state};results.push(entry);
        if(state.overflow||state.navOverflow||state.copyOverlap||state.footerOverlap||state.legacy)failures.push(entry);
      }
      console.log(`${engine} ${locale}${path||'/'}: eight sizes checked`);
    }
  }
  for (const locale of ['en','zh-hant','ja']) {
    await page.setViewportSize({width:1100,height:720});await page.goto(`${base}/${locale}/members`,{waitUntil:'load'});
    const menu=page.locator('.site-mobile-trigger');await menu.click();
    await page.locator('.site-mobile-menu a[href$="/members"]').waitFor({state:'visible'});
    await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/zh-hant`,{waitUntil:'load'});
  for(const selector of ['#products','#films','#family','#join']) {
    const section=page.locator(selector);if(!await section.count())continue;
    await section.scrollIntoViewIfNeeded();
    for(const v of [{width:2435,height:498},{width:390,height:844},{width:1440,height:1000},{width:3440,height:1440},{width:1280,height:720}])await page.setViewportSize(v);
    await page.waitForTimeout(900);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    if(overflow)failures.push({fastResize:selector,overflow});
  }
  if(errors.length)failures.push({browserErrors:errors});
  assert.deepEqual(errors,[]);
} finally {await browser.close();await fs.writeFile(`${out}/${engine}-responsive.json`,JSON.stringify({results,failures},null,2));}
console.log(JSON.stringify({engine,checks:results.length,failures}));
assert.deepEqual(failures,[]);
