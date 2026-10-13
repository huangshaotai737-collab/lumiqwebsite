import {chromium, firefox, webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import os from 'node:os';
import {runAuditStage} from './platform-audit-stage.mjs';

const base=process.env.SITE_URL||'http://localhost:4223';
const out=process.env.QA_OUTPUT||'qa/release-platform';
const timeoutMs=Number(process.env.AUDIT_TIMEOUT_MS||30000);
const navigationTimeoutMs=Number(process.env.AUDIT_TIMEOUT_MS||60000);
assert.ok(Number.isFinite(timeoutMs)&&timeoutMs>0,'AUDIT_TIMEOUT_MS must be a positive number');
await fs.mkdir(out,{recursive:true});
const routes=['','/products','/products/ola','/products/ola-go','/products/tablet','/products/print','/products/nest','/story','/plans','/faq','/members'];
const sizes=[{width:320,height:740},{width:390,height:844},{width:768,height:1024},{width:1024,height:1280},{width:1100,height:1000},{width:1280,height:720},{width:1440,height:900},{width:2435,height:498},{width:3440,height:1440}];
const checks=[],failures=[];
const metadata={platform:os.platform(),release:os.release(),arch:os.arch()};
let current;
const save=async(status='running')=>{
 // Replace the report atomically so interrupted jobs retain the last complete JSON.
 const path=`${out}/platform-report.json`;
 await fs.writeFile(`${path}.tmp`,JSON.stringify({...metadata,status,current,checks,failures},null,2));
 await fs.rename(`${path}.tmp`,path);
};
await fs.writeFile(`${out}/platform-progress.jsonl`,'');
const record=async(event)=>{
 current=event;
 const line=JSON.stringify(event);
 console.log(line);
 await fs.appendFile(`${out}/platform-progress.jsonl`,`${line}\n`);
};
const stage=(context,name,operation,limitMs=timeoutMs)=>runAuditStage(context,name,operation,{timeoutMs:limitMs,record});
const engines={chromium,firefox,webkit};
if(process.env.TEST_EDGE==='1')engines.edge=chromium;
await save();
for(const [engine,type] of Object.entries(engines)){
 let browser;
 const errors=[];
 try{
  browser=await stage({engine},'launch',()=>type.launch(engine==='edge'?{channel:'msedge',timeout:timeoutMs}:{timeout:timeoutMs}));
  const page=await stage({engine},'new-page',()=>browser.newPage());
  page.setDefaultTimeout(timeoutMs);page.setDefaultNavigationTimeout(navigationTimeoutMs);
  page.on('pageerror',e=>errors.push({message:e.message,stack:e.stack}));
  for(const locale of ['en','zh-hant','ja'])for(const route of routes){
   const context={engine,locale,route};
   try{
    // Slow/unsupported media must not hold the layout audit at window.load.
    // Wait for the actual page and its typography instead of unrelated videos.
    const response=await stage(context,'navigate',()=>page.goto(`${base}/${locale}${route}`,{waitUntil:'domcontentloaded',timeout:navigationTimeoutMs}),navigationTimeoutMs);
    await stage(context,'main',()=>page.locator('main').waitFor());
    await stage(context,'fonts',async()=>{
     const handle=await page.waitForFunction(()=>document.fonts.status==='loaded',null,{timeout:timeoutMs});
     await handle.dispose();
    });
    if(!route)await stage(context,'home-open',()=>page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open',null,{timeout:navigationTimeoutMs}),navigationTimeoutMs);
    await stage(context,'settle',()=>page.waitForTimeout(250));
    for(const viewport of sizes){
     const viewContext={...context,viewport};
     await stage(viewContext,'viewport',()=>page.setViewportSize(viewport));
     await stage(viewContext,'settle',()=>page.waitForTimeout(120));
     const state=await stage(viewContext,'evaluate',()=>page.evaluate(()=>{
      const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
      const intersect=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
      const blocks=[...document.querySelectorAll('.pd-product-tagline,.pd-hero-lede,.pd-concept-note,.pd-hero-display-title')].filter(visible).map(e=>e.getBoundingClientRect());
      const overlaps=blocks.some((a,i)=>blocks.slice(i+1).some(b=>intersect(a,b)));
      const main=document.querySelector('main.product-detail-light');
      const isDark=value=>{const rgb=(value.match(/[\d.]+/g)||[]).slice(0,3).map(Number);return rgb.length===3&&Math.max(...rgb)<150;};
      // Light pages use dark reading text; compact primary actions retain
      // white lettering on their intentionally dark button surface.
      const wrongColor=main?[...main.querySelectorAll('*')].filter(e=>visible(e)&&!e.closest('.pd-primary-action')&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&!isDark(getComputedStyle(e).color)&&!isDark(getComputedStyle(e).webkitTextFillColor)).map(e=>e.textContent.slice(0,30)):[];
      const member=document.querySelector('.members-heading h1');
      return {overflow:document.documentElement.scrollWidth>innerWidth+1,overlaps,wrongColor,memberReadable:!member||isDark(getComputedStyle(member).color),legacy:document.querySelectorAll('.lh-glass-word,.lh-hero-object,.lh-brand-character').length};
     }));
     const item={engine,locale,route,viewport,status:response?.status()??0,...state};checks.push(item);
     if(item.status!==200||state.overflow||state.overlaps||state.wrongColor.length||!state.memberReadable||state.legacy)failures.push(item);
    }
    if(locale==='zh-hant'&&['/products/tablet','/members'].includes(route))await stage(context,'screenshot',()=>page.screenshot({path:`${out}/${engine}-${route.replaceAll('/','-')}.png`,timeout:timeoutMs}));
   }finally{await save();}
  }
 }catch(error){
  failures.push({engine,...error.audit,message:error.message});
 }finally{
  if(errors.length)failures.push({engine,errors});
  if(browser){
   try{await stage({engine},'close',()=>browser.close());}
   catch(error){failures.push({engine,...error.audit,message:error.message});}
  }
  await save();
 }
 console.log(`${os.platform()} ${engine}: ${checks.filter(c=>c.engine===engine).length} cases, ${failures.length} total failures`);
}
await save(failures.length?'failed':'passed');
assert.deepEqual(failures,[]);
