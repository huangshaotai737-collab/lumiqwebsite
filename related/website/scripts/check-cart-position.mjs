import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium,firefox,webkit} from '@playwright/test';

const base = process.env.SITE_URL || 'http://localhost:4238';
const out = process.env.QA_OUTPUT || '/private/tmp/lumiq-cart-position';
await fs.mkdir(out,{recursive:true});
const results = [], failures = [];
const state = page => page.evaluate(() => {
  const selectors = ['.site-nav','main','.pd-hero-display-title','.lh-hero-copy','.members-heading'];
  const boxes = Object.fromEntries(selectors.map(selector => {
    const rect = document.querySelector(selector)?.getBoundingClientRect();
    return [selector,rect ? {x:rect.x,y:rect.y,width:rect.width} : null];
  }));
  return {y:scrollY,contentWidth:document.documentElement.clientWidth,boxes};
});
function unchanged(before,after,label) {
  assert(Math.abs(after.y-before.y)<=1,`${label}: scroll moved ${after.y-before.y}px`);
  assert.equal(after.contentWidth,before.contentWidth,`${label}: viewport content width changed`);
  for(const [selector,box] of Object.entries(before.boxes)) if(box) {
    for(const property of ['x','y','width']) assert(Math.abs(after.boxes[selector][property]-box[property])<=1,
      `${label}: ${selector} ${property} moved ${after.boxes[selector][property]-box[property]}px`);
  }
}
for(const [engine,type] of Object.entries({chromium,firefox,webkit})) {
  const browser = await type.launch();
  try {
    for(const locale of ['en','zh-hant','ja']) for(const route of ['', '/products/tablet','/members']) {
      for(const viewport of [{width:320,height:740},{width:768,height:1024},{width:1440,height:900},{width:2560,height:1440}]) {
        const name = `${engine}/${locale}${route}/${viewport.width}`;
        const context = await browser.newContext({viewport});
        const page = await context.newPage();
        page.setDefaultTimeout(20000);
        const errors = [];
        page.on('pageerror',e=>errors.push(e.message));
        try {
          await page.goto(`${base}/${locale}${route}`,{waitUntil:'domcontentloaded'});
          await page.waitForFunction(()=>document.fonts.status==='loaded' && document.querySelector('.cart-nav-trigger') && !document.querySelector('.cart-nav-trigger').disabled);
          if(!route) await page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open');
          await page.evaluate(offset=>scrollTo({top:offset,behavior:'instant'}),route ? 480 : 0);
          await page.waitForTimeout(700);
          const before = await state(page);
          for(let cycle=0;cycle<2;cycle++) {
            await page.locator('.cart-nav-trigger').click();
            await page.waitForFunction(()=>document.querySelector('#lumiq-cart')?.open && document.querySelector('#lumiq-cart').getAnimations().every(a=>['finished','idle'].includes(a.playState)));
            await page.waitForTimeout(100);
            unchanged(before,await state(page),`${name} open ${cycle}`);
            const bounds = await page.locator('#lumiq-cart').evaluate(element => {
              const rect = element.getBoundingClientRect();
              return {left:rect.left,right:rect.right,width:rect.width,viewport:innerWidth};
            });
            assert(bounds.left>=-1 && Math.abs(bounds.right-bounds.viewport)<=1,
              `${name}: drawer must stay inside and touch the right viewport edge: ${JSON.stringify(bounds)}`);
            await page.mouse.wheel(0,250);
            await page.waitForTimeout(150);
            unchanged(before,await state(page),`${name} locked ${cycle}`);
            if(cycle===0) await page.locator('#lumiq-cart .cart-icon-button').click();
            else await page.keyboard.press('Escape');
            await page.waitForFunction(()=>!document.querySelector('#lumiq-cart')?.open);
            await page.waitForTimeout(150);
            unchanged(before,await state(page),`${name} close ${cycle}`);
          }
          assert.deepEqual(errors,[],`${name}: runtime errors`);
          results.push({name,before});
          console.log(`PASS cart position ${name}`);
        } catch(error) {
          failures.push({name,error:error.message});
          console.log(`FAIL cart position ${name}: ${error.message}`);
        } finally {await context.close();}
        await fs.writeFile(`${out}/report.json`,JSON.stringify({base,results,failures},null,2));
      }
    }
  } finally {await browser.close();}
}
assert.deepEqual(failures,[]);
