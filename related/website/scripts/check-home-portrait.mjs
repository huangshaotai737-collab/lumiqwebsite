import {chromium, firefox, webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=process.env.SITE_URL||'http://localhost:4233';
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-home-portrait';
await fs.mkdir(out,{recursive:true});
const sizes=[{width:320,height:740},{width:390,height:844},{width:600,height:960},{width:767,height:1024},{width:768,height:1024},{width:820,height:1180},{width:1043,height:1255},{width:1100,height:1000}];
const checks=[],failures=[];
const engines=process.env.QA_ENGINES?.split(',')||['chromium','firefox','webkit'];
for(const engine of engines){
 const browser=await {chromium,firefox,webkit}[engine].launch();
 try{
  const page=await browser.newPage();page.setDefaultTimeout(20000);
  for(const locale of (process.env.QA_LOCALES?.split(',')||['en','zh-hant','ja']))for(const viewport of sizes){
   await page.setViewportSize(viewport);
   await page.goto(`${base}/${locale}`,{waitUntil:'domcontentloaded'});
   await page.locator('.lh-mobile-hero-art img').evaluate(e=>e.decode());
   await page.waitForTimeout(400);
   const state=await page.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();
    const art=rect('.lh-mobile-hero-art'),copy=rect('.lh-hero-copy'),hero=rect('.lh-hero');
    const image=document.querySelector('.lh-mobile-hero-art img');
    const style=getComputedStyle(image);
    // A contain image can leave undecorated columns even when its element spans the viewport.
    const painted=style.objectFit==='contain'?Math.min(art.width,art.height*image.naturalWidth/image.naturalHeight):art.width;
    const frame=rect('.lumiq-root');
    return {art,copy,hero,frame,painted,currentSrc:image.currentSrc,overflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   const item={engine,locale,viewport,...state};checks.push(item);
   const safeCopy=state.copy.left>=state.frame.left+18&&state.copy.right<=state.frame.right-18;
   const separated=viewport.width<768||state.art.top>=state.copy.bottom-1;
   if(state.overflow||state.painted<state.frame.width-2||!safeCopy||!separated)failures.push(item);
   if(locale==='zh-hant'&&[390,820,1043].includes(viewport.width))await page.screenshot({path:`${out}/${engine}-${viewport.width}.png`});
  }
 }finally{await browser.close();}
}
await fs.writeFile(`${out}/report.json`,JSON.stringify({base,checks,failures},null,2));
console.log(`${checks.length} portrait composition checks; ${failures.length} failures`);
assert.deepEqual(failures,[]);
