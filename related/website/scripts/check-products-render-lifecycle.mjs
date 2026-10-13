import {chromium,firefox,webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://127.0.0.1:4235';
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-products-lifecycle';
await fs.mkdir(out,{recursive:true});
const results=[],failures=[];
for(const engine of (process.env.QA_ENGINES?.split(',')||['chromium','firefox','webkit'])){
 const browser=await {chromium,firefox,webkit}[engine].launch();
 try{
  const page=await browser.newPage({viewport:{width:3440,height:1440}});
  const errors=[];
  page.on('pageerror',error=>errors.push({message:error.message,stack:error.stack}));
  page.setDefaultTimeout(20000);
  for(const locale of ['en','zh-hant','ja'])try{
   await page.goto(`${base}/${locale}/products`,{waitUntil:'domcontentloaded'});
   await page.locator('.prod-glass-material').first().waitFor();
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.waitForTimeout(700);
   assert.equal(await page.locator('.prod-glass-material canvas').count(),0,'Cards only peeking into the tall desktop viewport must not start GPU rendering');
   await page.setViewportSize({width:320,height:740});
   await page.waitForTimeout(700);
   const initial=await page.evaluate(()=>({canvases:document.querySelectorAll('.prod-glass-material canvas').length,overflow:document.documentElement.scrollWidth>innerWidth+1}));
   assert.equal(initial.canvases,0,'Offscreen product slabs must not allocate WebGL canvases');
   assert(!initial.overflow);
   await page.locator('.prod-carousel').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelectorAll('.prod-glass-material canvas').length>0);
   const visible=await page.locator('.prod-glass-material canvas').count();
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelectorAll('.prod-glass-material canvas').length===0);
   await page.locator('#product-tab-tablet').click();
   await page.waitForFunction(()=>document.querySelector('#product-tab-tablet')?.getAttribute('aria-selected')==='true');
   await page.locator('.prod-carousel').evaluate(e=>e.scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForFunction(()=>document.querySelectorAll('.prod-glass-material canvas').length>0);
   await page.goto(`${base}/${locale}/faq`,{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(600);
   assert.deepEqual(errors,[],'Async decorative Canvas creation/disposal must not throw DOM event binding errors');
   results.push({engine,locale,initial,visible,returnedCanvases:0,selectionWorks:true});
  }catch(error){failures.push({engine,locale,error:error.message});}
 }finally{await browser.close();}
}
await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures},null,2));
console.log(`${results.length} passed; ${failures.length} failed product rendering lifecycle checks`);
assert.deepEqual(failures,[]);
