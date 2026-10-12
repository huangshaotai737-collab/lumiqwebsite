import { chromium, firefox, webkit } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.SITE_URL||'http://localhost:4227';
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-anchor-fix-20261013';
await fs.mkdir(out,{recursive:true});
const results=[],failures=[];
const types={chrome:chromium,firefox,webkit};
for(const engine of (process.env.ENGINE?[process.env.ENGINE]:Object.keys(types))){
 const browser=await types[engine].launch(engine==='chrome'?{channel:'chrome'}:{});
 const page=await browser.newPage({viewport:{width:390,height:1000}});
 await page.addInitScript(()=>{
  window.__anchorTrace=[];
  const log=(event,data)=>window.__anchorTrace.push({event,t:Math.round(performance.now()),y:scrollY,...data});
  const original=window.scrollTo;window.scrollTo=function(...args){log('scrollTo',{args,stack:new Error().stack});return original.apply(this,args)};
  for(const event of ['resize','pageshow','hashchange','popstate'])window.addEventListener(event,()=>log(event,{width:innerWidth,hash:location.hash}));
 });
 const ready=async()=>{await page.locator('.lh-home[data-home-state="open"]').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1100)};
 const state=()=>page.locator('#products').evaluate(e=>({y:scrollY,hash:location.hash,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,height:innerHeight,width:innerWidth}));
 const aligned=async(name)=>{const s=await state();assert(s.top<160&&s.bottom>160,`${name}: product anchor must land below navigation: ${JSON.stringify(s)}`);return s};
 async function check(name,fn){if(process.env.CASE&&!name.includes(process.env.CASE))return;try{results.push({engine,name,evidence:await fn()});console.log(`PASS ${engine}: ${name}`)}catch(e){failures.push({engine,name,error:e.message,trace:await page.evaluate(()=>window.__anchorTrace)});await page.screenshot({path:`${out}/${engine}-${failures.length}.png`});console.log(`FAIL ${engine}: ${name}: ${e.message}`)}}
 try{
  for(const locale of (process.env.QUICK?['zh-hant']:['en','zh-hant','ja'])){
   await check(`${locale} narrow to desktop then refresh`,async()=>{
    await page.goto(`${base}/${locale}/faq`);await page.setViewportSize({width:390,height:1000});await page.goto(`${base}/${locale}#products`,{waitUntil:'domcontentloaded'});await ready();await aligned('narrow');
    await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${locale}#products`,{waitUntil:'domcontentloaded'});await ready();const before=await aligned('desktop entry');
    await page.reload({waitUntil:'domcontentloaded'});await ready();return {before,after:await aligned('desktop reload')};
   });
   if(process.env.QUICK)continue;
   await check(`${locale} late browser restoration keeps anchor aligned`,async()=>{
    await page.setViewportSize({width:390,height:1000});await page.goto(`${base}/${locale}/faq`);await page.goto(`${base}/${locale}#products`);await ready();await aligned('initial entry');
    await page.evaluate(()=>window.scrollTo({top:scrollY-104,behavior:'instant'}));await page.waitForTimeout(500);return aligned('late restoration');
   });
   await check(`${locale} anchor survives live breakpoint changes`,async()=>{
    await page.goto(`${base}/${locale}#products`);await ready();const samples=[];
    for(const width of [390,768,1100,1101,1440,2435,3440,390]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(700);samples.push(await aligned(`resize ${width}`))}return samples;
   });
   await check(`${locale} user scroll is not overridden by stale hash`,async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${locale}#products`);await ready();
    await page.mouse.move(25,500);await page.mouse.wheel(0,1800);await page.waitForTimeout(300);await page.mouse.wheel(0,700);await page.waitForTimeout(900);const moved=await state();assert(moved.top<-300,'A fresh wheel gesture must leave product anchor');
    await page.setViewportSize({width:1920,height:1000});await page.waitForTimeout(900);const after=await state();assert(after.top<-300,'Resizing must not pull the reader back to a stale URL hash');return {moved,after};
   });
   await check(`${locale} manual reading survives height-only resize`,async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${locale}#products`);await ready();
    await page.keyboard.press('ArrowDown');await page.waitForTimeout(600);const before=await state();
    await page.setViewportSize({width:1440,height:800});await page.waitForTimeout(1200);const after=await state();
    assert(Math.abs(after.top-before.top)<2,`Reading position changed after height resize: ${JSON.stringify({before,after})}`);return {before,after};
   });
   await check(`${locale} manual reading survives narrow to wide resize`,async()=>{
    await page.setViewportSize({width:390,height:1000});await page.goto(`${base}/${locale}#products`);await ready();
    await page.keyboard.press('ArrowUp');await page.waitForTimeout(600);const before=await state();
    await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(1200);const after=await state();
    assert(Math.abs(after.top-before.top)<2,`Reading position changed after width resize: ${JSON.stringify({before,after})}`);return {before,after};
   });
   await check(`${locale} wheel input cancels pending resize restoration`,async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${locale}#products`);await ready();
    await page.keyboard.press('ArrowDown');await page.waitForTimeout(600);await page.setViewportSize({width:1440,height:800});
    await page.mouse.move(25,500);await page.mouse.wheel(0,20000);await page.waitForTimeout(1600);
    // A large wheel pulse deliberately stops at the next reading composition.
    // Verify that resize restoration does not pull it back to the product
    // chapter; reaching the document bottom belongs to the End-key test below.
    const after=await state();
    assert(after.top<-300,`Resize restoration interrupted wheel input: ${JSON.stringify(after)}`);return after;
   });
   // WebKit's End key does not consistently scroll the document; wheel input
   // above exercises cancellation in that engine using its native scroll path.
   if(engine!=='webkit')await check(`${locale} keyboard input cancels pending resize restoration`,async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${locale}#products`);await ready();
    await page.keyboard.press('ArrowDown');await page.waitForTimeout(600);await page.setViewportSize({width:1440,height:800});
    await page.keyboard.press('End');await page.waitForTimeout(1600);
    const after=await page.evaluate(()=>({y:scrollY,max:document.documentElement.scrollHeight-innerHeight}));
    assert(Math.abs(after.max-after.y)<2,`Resize restoration interrupted keyboard input: ${JSON.stringify(after)}`);return after;
   });
   await check(`${locale} browser back restores anchor`,async()=>{
    await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${locale}/faq`);await page.goto(`${base}/${locale}#products`);await ready();
    await page.locator('.site-desktop-nav a[href$="/faq"]').click();await page.waitForURL('**/faq');await page.locator('.lh-home').waitFor({state:'detached'});await page.goBack();await ready();return aligned('history return');
   });
  }
 }finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({base,results,failures},null,2));}
}
assert.deepEqual(failures.map(({engine,name,error})=>({engine,name,error})),[]);
