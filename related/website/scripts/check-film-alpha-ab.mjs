import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {firefox,chromium} from '@playwright/test';

const base=process.env.SITE_URL||'http://localhost:4234';
// Optional experiment only: a local candidate is never a shipped website asset.
const candidate=process.env.ALPHA_CANDIDATE;
assert.ok(candidate,'Set ALPHA_CANDIDATE to an explicit temporary alpha video before running the A/B experiment');
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-film-alpha-ab';
const engine=process.env.ENGINE||'firefox';
const original=await fs.readFile('public/assets/character-20261012/ola-girl-clean-alpha.webm');
const optimized=await fs.readFile(candidate);
const browser=await ({firefox,chromium}[engine]).launch({headless:process.env.HEADED!=='1',...(engine==='chromium'?{channel:'chrome'}:{})});
await fs.mkdir(out,{recursive:true});
const results=[],failures=[];
async function stage(label,operation,timeout=25000) {
 console.log(`START ${label}`);let timer;
 try {const value=await Promise.race([operation(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(`${label} timed out after ${timeout}ms`)),timeout);})]);console.log(`END ${label}`);return value;}
 finally{clearTimeout(timer);}
}
try {
 for(const viewport of (process.env.FOCUSED==='1'?[{width:1440,height:900}]:[{width:1440,height:900},{width:3440,height:1440}]))for(const name of (process.env.FOCUSED==='1'?['original','optimized']:['original','optimized','original-repeat','optimized-repeat'])) {
  const context=await browser.newContext({viewport});
  const body=name.startsWith('original')?original:optimized;
  try {
   await context.route('**/ola-girl-clean-alpha.webm',async route=>{
    const range=route.request().headers()['range'];
    const headers={'accept-ranges':'bytes','content-type':'video/webm','cache-control':'no-store'};
    if(range) {
     const match=/bytes=(\d+)-(\d*)/.exec(range);
     const start=Number(match?.[1]||0),end=Math.min(body.length-1,Number(match?.[2]||body.length-1));
     await route.fulfill({status:206,headers:{...headers,'content-range':`bytes ${start}-${end}/${body.length}`,'content-length':String(end-start+1)},body:body.subarray(start,end+1)});
    } else await route.fulfill({status:200,headers:{...headers,'content-length':String(body.length)},body});
   });
   const page=await stage(`${name}/new-page`,()=>context.newPage());
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   await stage(`${name}/navigate`,()=>page.goto(`${base}/zh-hant`,{waitUntil:'domcontentloaded',timeout:40000}),42000);
   await stage(`${name}/home-open`,()=>page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open',null,{timeout:25000}));
   await stage(`${name}/fonts`,()=>page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,12000))])));
   await page.bringToFront();
   await page.waitForTimeout(900);
   for(const state of ['first-entry','warm-entry']) {
    if(state==='warm-entry') {
     await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
     await page.waitForTimeout(250);
    }
    const data=await stage(`${name}/${state}/samples`,()=>page.evaluate(async()=>{
     const stage=document.querySelector('.lh-films-stage');
     const y=scrollY+stage.getBoundingClientRect().top-(innerHeight-stage.clientHeight)/2;
     const movie=document.querySelector('.lh-film-character video');
     const started=performance.now(),frames=[];let last=started,firstAdvance=null;
     scrollTo({top:y,behavior:'instant'});
     return await new Promise(resolve=>{
      let finished=false;
      const finish=timedOut=>{if(finished)return;finished=true;resolve({frames,firstAdvance,time:movie.currentTime,width:movie.videoWidth,height:movie.videoHeight,paused:movie.paused,error:movie.error?.code,host:movie.parentElement.getBoundingClientRect().toJSON(),timedOut,hidden:document.hidden});};
      setTimeout(()=>finish(true),6500);
      function frame(t) {
       if(finished)return;
       frames.push(t-last);last=t;
       if(firstAdvance===null&&movie.currentTime>.15)firstAdvance=t-started;
       const progress=Math.min(1,(t-started)/3200);
       if(progress>.2)scrollTo({top:y+Math.sin(progress*Math.PI*2)*innerHeight*.05,behavior:'instant'});
       if(progress<1)requestAnimationFrame(frame);else finish(false);
      }
      requestAnimationFrame(frame);
     });
    }));
    const sorted=data.frames.slice(1).sort((a,b)=>a-b);
    const result={engine,version:browser.version(),variant:name,bytes:body.length,viewport,state,frames:data.frames.length,p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],max:Math.max(...sorted),over50:sorted.filter(v=>v>50).length,over100:sorted.filter(v=>v>100).length,...Object.fromEntries(Object.entries(data).filter(([key])=>key!=='frames'))};
    results.push(result);console.log(JSON.stringify(result));
    assert.equal(result.error,undefined);
    assert.ok(result.firstAdvance!==null,'Girl must actually advance');
    if(state==='first-entry')await page.screenshot({path:`${out}/${engine}-${name}-${viewport.width}.png`});
    await fs.writeFile(`${out}/${engine}-ab-report.json`,JSON.stringify({base,candidate,results,failures},null,2));
   }
   assert.deepEqual(errors,[]);
  }catch(error){failures.push({engine,variant:name,viewport,message:error.message});console.log('FAIL',error.message);}
  finally{await context.close();await fs.writeFile(`${out}/${engine}-ab-report.json`,JSON.stringify({base,candidate,results,failures},null,2));}
 }
}finally{await browser.close();}
assert.deepEqual(failures,[]);
