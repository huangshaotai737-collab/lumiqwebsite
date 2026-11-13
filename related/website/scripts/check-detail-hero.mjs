import {chromium, firefox, webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.SITE_URL||'http://localhost:4223';
const out=process.env.QA_OUTPUT||'qa/detail-hero';
await fs.mkdir(out,{recursive:true});
const results=[],failures=[];
for(const [engine,type] of Object.entries({chromium,firefox,webkit})){
 const browser=await type.launch(engine==='webkit'&&process.env.AUDIT_HEADED_WEBKIT==='1'?{headless:false}:{});
 try{
  const page=await browser.newPage();
  for(const locale of ['en','zh-hant','ja'])for(const slug of ['tablet','ola','ola-go','print','nest']){
   await page.goto(`${base}/${locale}/products/${slug}`, {waitUntil:'domcontentloaded'});
   await page.locator('main.product-detail-light > section:nth-of-type(2) > .pd-shell').waitFor();
   await page.waitForFunction(()=>document.fonts.status==='loaded');
   for(const viewport of [{width:390,height:844},{width:1440,height:1000},{width:2536,height:1278},{width:3440,height:1440}]){
    await page.setViewportSize(viewport);
    const metrics=await page.evaluate(()=>{
     const heroElement=document.querySelector('main.product-detail-light > section:first-of-type');
     const storyElement=document.querySelector('main.product-detail-light > section:nth-of-type(2)');
     const hero=heroElement.getBoundingClientRect(),grid=heroElement.querySelector('.pd-shell').getBoundingClientRect(),story=storyElement.querySelector('.pd-shell').getBoundingClientRect();
     const title=document.querySelector('.orb-hero-copy h1')||document.querySelector(innerWidth>=981?'.pd-hero-display-title':'.pd-product-name');
     const style=getComputedStyle(title);
     const dark=value=>{const rgb=(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);return rgb.length===3&&Math.max(...rgb)<150;};
     const heroPadding=parseFloat(getComputedStyle(heroElement).paddingBottom),storyPadding=parseFloat(getComputedStyle(storyElement).paddingTop);
     return {heroTrailing:hero.bottom-grid.bottom,between:story.top-grid.bottom,heroPadding,storyPadding,titleReadable:!!title.textContent.trim()&&dark(style.color)&&dark(style.webkitTextFillColor),overflow:document.documentElement.scrollWidth-innerWidth};
    });
    const item={engine,locale,slug,viewport,...metrics};results.push(item);
    // Both the shared template and Orb's custom hero must end at their
    // content plus section padding, without a stale fixed-height blank area.
    if(!metrics.titleReadable||metrics.overflow>1||(viewport.width>=981&&(metrics.heroTrailing>metrics.heroPadding+1||metrics.between>metrics.heroPadding+metrics.storyPadding+2)))failures.push(item);
   }
  }
 }finally{await browser.close();}
}
await fs.writeFile(`${out}/hero-report.json`,JSON.stringify({results,failures},null,2));
console.log(`${results.length} hero checks; ${failures.length} failures`);
assert.deepEqual(failures,[]);
