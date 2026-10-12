import {chromium, firefox, webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import os from 'node:os';

const base=process.env.SITE_URL||'http://localhost:4223';
const out=process.env.QA_OUTPUT||'qa/release-platform';
await fs.mkdir(out,{recursive:true});
const routes=['','/products','/products/ola','/products/ola-go','/products/tablet','/products/print','/products/nest','/story','/plans','/faq','/members'];
const sizes=[{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1440,height:900},{width:2435,height:498},{width:3440,height:1440}];
const checks=[],failures=[];
const engines={chromium,firefox,webkit};
if(process.env.TEST_EDGE==='1')engines.edge=chromium;
for(const [engine,type] of Object.entries(engines)){
 const browser=await type.launch(engine==='edge'?{channel:'msedge'}:{});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const locale of ['en','zh-hant','ja'])for(const route of routes){
  // Slow/unsupported media must not hold the layout audit at window.load.
  // Wait for the actual page and its typography instead of unrelated videos.
  const response=await page.goto(`${base}/${locale}${route}`,{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('main').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  if(!route)await page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open',null,{timeout:60000});
  await page.waitForTimeout(250);
  for(const viewport of sizes){
   await page.setViewportSize(viewport);await page.waitForTimeout(120);
   const state=await page.evaluate(()=>{
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const intersect=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
    const blocks=[...document.querySelectorAll('.pd-product-tagline,.pd-hero-lede,.pd-concept-note,.pd-hero-display-title')].filter(visible).map(e=>e.getBoundingClientRect());
    const overlaps=blocks.some((a,i)=>blocks.slice(i+1).some(b=>intersect(a,b)));
    const main=document.querySelector('main.product-detail-light');
    const wrongColor=main?[...main.querySelectorAll('*')].filter(e=>visible(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&getComputedStyle(e).color!=='rgb(255, 255, 255)'&&getComputedStyle(e).webkitTextFillColor!=='rgb(255, 255, 255)').map(e=>e.textContent.slice(0,30)):[];
    const member=document.querySelector('.members-heading h1');
    return {overflow:document.documentElement.scrollWidth>innerWidth+1,overlaps,wrongColor,memberWhite:!member||getComputedStyle(member).color==='rgb(255, 255, 255)',legacy:document.querySelectorAll('.lh-glass-word,.lh-hero-object,.lh-brand-character').length};
   });
   const item={engine,locale,route,viewport,status:response.status(),...state};checks.push(item);
   if(response.status()!==200||state.overflow||state.overlaps||state.wrongColor.length||!state.memberWhite||state.legacy)failures.push(item);
  }
  if(locale==='zh-hant'&&['/products/tablet','/members'].includes(route))await page.screenshot({path:`${out}/${engine}-${route.replaceAll('/','-')}.png`});
 }
 if(errors.length)failures.push({engine,errors});
 await browser.close();
 console.log(`${os.platform()} ${engine}: ${checks.filter(c=>c.engine===engine).length} cases, ${failures.length} total failures`);
}
await fs.writeFile(`${out}/platform-report.json`,JSON.stringify({platform:os.platform(),release:os.release(),arch:os.arch(),checks,failures},null,2));
assert.deepEqual(failures,[]);
