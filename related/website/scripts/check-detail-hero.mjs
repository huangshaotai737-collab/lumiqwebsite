import {chromium, firefox, webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.SITE_URL||'http://localhost:4223';
const out=process.env.QA_OUTPUT||'qa/detail-hero';
await fs.mkdir(out,{recursive:true});
const results=[],failures=[];
for(const [engine,type] of Object.entries({chromium,firefox,webkit})){
 const browser=await type.launch();
 try{
  const page=await browser.newPage();
  for(const locale of ['en','zh-hant','ja'])for(const slug of ['tablet','ola','ola-go','print','nest']){
   await page.goto(`${base}/${locale}/products/${slug}`);
   for(const viewport of [{width:390,height:844},{width:1440,height:1000},{width:2536,height:1278},{width:3440,height:1440}]){
    await page.setViewportSize(viewport);
    const metrics=await page.evaluate(()=>{
     const rect=s=>document.querySelector(s).getBoundingClientRect();
     const hero=rect('.pd-hero-floor'),grid=rect('.pd-hero-grid'),story=rect('.pd-story-grid');
     const title=document.querySelector(innerWidth>=981?'.pd-hero-display-title':'.pd-product-name');
     const style=getComputedStyle(title);
     return {heroTrailing:hero.bottom-grid.bottom,between:story.top-grid.bottom,titleWhite:style.color==='rgb(255, 255, 255)'&&style.webkitTextFillColor==='rgb(255, 255, 255)',overflow:document.documentElement.scrollWidth-innerWidth};
    });
    const item={engine,locale,slug,viewport,...metrics};results.push(item);
    if(!metrics.titleWhite||metrics.overflow>1||(viewport.width>=981&&(metrics.heroTrailing>65||metrics.between>130)))failures.push(item);
   }
  }
 }finally{await browser.close();}
}
await fs.writeFile(`${out}/hero-report.json`,JSON.stringify({results,failures},null,2));
console.log(`${results.length} hero checks; ${failures.length} failures`);
assert.deepEqual(failures,[]);
