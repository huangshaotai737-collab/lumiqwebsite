import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import {chromium,firefox,webkit} from '@playwright/test';

// RAF intervals indicate main-thread scheduling under this synthetic scroll.
// They are diagnostic data, not proof of physical-device paint FPS.
const base=process.env.SITE_URL||'http://localhost:4233';
const output=process.env.QA_OUTPUT||'/private/tmp/lumiq-motion-frames-20261013';
const checks=[],failures=[];
await fs.mkdir(output,{recursive:true});
const save=()=>fs.writeFile(`${output}/frame-report.json`,JSON.stringify({base,platform:os.platform(),checks,failures},null,2));
const engines=(process.env.ENGINES||'chromium,firefox,webkit').split(',');
for(const name of engines) {
 const type=({chromium,firefox,webkit}[name]);
 const browser=await type.launch({headless:process.env.HEADED!=='1',...(name==='chromium' && process.env.CHROME_SYSTEM==='1'?{channel:'chrome'}:{})});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.setDefaultTimeout(30000);
  await page.goto(`${base}/zh-hant`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open');
  await page.evaluate(()=>Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,10000))]));
  await page.waitForTimeout(1000);
  const sizes=process.env.FOCUSED==='1'?[{width:1440,height:900},{width:3440,height:1440},{width:1440,height:900},{width:3440,height:1440}]:[{width:1440,height:900},{width:3440,height:1440},{width:1024,height:1280},{width:320,height:740}];
  const visited=new Set();
  for(const viewport of sizes) {
   const key=`${viewport.width}x${viewport.height}`;
   const sample=visited.has(key)?'repeat-entry':'first-sample';visited.add(key);
   await page.setViewportSize(viewport);await page.waitForTimeout(500);
   for(const part of ['opening','films-background']) {
    try {
     const data=await page.evaluate(async part=>{
      const bg=document.querySelector('[data-background-video]');
      const opening=document.querySelector('.lh-opening');
      const films=document.querySelector('.lh-films-stage');
      const from=part==='opening'?0:scrollY+films.getBoundingClientRect().top-(innerHeight-films.clientHeight)/2;
      const to=part==='opening'?Math.min(opening.clientHeight-innerHeight,innerHeight*2.85):from+innerHeight*1.2;
      const duration=1800,frames=[];
      scrollTo({top:Math.max(0,from),behavior:'instant'});
      await new Promise(resolve=>setTimeout(resolve,300));
      const canvas=document.querySelector('#products canvas');
      const gl=canvas?.getContext('webgl2');
      const debug=gl?.getExtension('WEBGL_debug_renderer_info');
      const renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl?.getParameter(gl.RENDERER);
      return await new Promise(resolve=>{
       const started=performance.now();let last=started;
       function sample(time) {
        const progress=Math.min(1,(time-started)/duration);
        const travel=progress<.5?progress*2:2-progress*2;
        scrollTo({top:Math.max(0,from+(to-from)*travel),behavior:'instant'});
        frames.push({dt:time-last,y:scrollY,bg:bg?.dataset.ready,opacity:bg?.style.opacity,bgTime:bg?.currentTime,bgSeeking:bg?.seeking,openingTime:document.querySelector('.lh-opening-video').currentTime});
        last=time;
        if(progress<1)requestAnimationFrame(sample);else resolve({from,to,frames,renderer,actualViewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth+1});
       }
       requestAnimationFrame(sample);
      });
     },part);
     const intervals=data.frames.slice(1).map(f=>f.dt).sort((a,b)=>a-b);
     assert.deepEqual(data.actualViewport,viewport,'The browser must apply the requested viewport; a fixed-size headed WebKit window is not ultrawide evidence');
     const ready=data.frames.findIndex(f=>f.bg==='true');
     const rehidden=ready>=0?data.frames.slice(ready).filter(f=>f.bg!=='true'||f.opacity!=='1').length:0;
     const result={engine:name,version:browser.version(),systemChrome:name==='chromium'&&process.env.CHROME_SYSTEM==='1',headed:process.env.HEADED==='1',renderer:data.renderer,viewport,actualViewport:data.actualViewport,sample,part,from:data.from,to:data.to,frames:data.frames.length,p50:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],max:Math.max(...intervals),over50ms:intervals.filter(v=>v>50).length,over100ms:intervals.filter(v=>v>100).length,backgroundRehidden:rehidden,overflow:data.overflow,backgroundEverReady:ready>=0};
     checks.push(result);console.log('PASS',JSON.stringify(result));
     assert.equal(rehidden,0,'Decoded background must not flicker to the fallback during seek');
     assert.equal(data.overflow,false,'Viewport must not overflow during animation');
     await fs.writeFile(`${output}/${name}-${viewport.width}-${sample}-${part}-frames.json`,JSON.stringify(data,null,2));
    }catch(error){failures.push({engine:name,viewport,part,error:error.message});console.log('FAIL',error.message);}
    await save();
   }
  }
  if(name==='chromium') {
   await page.setViewportSize({width:1440,height:900});
   const cdp=await page.context().newCDPSession(page);
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.evaluate(()=>document.querySelector('#films').scrollIntoView({block:'center',behavior:'instant'}));
   await page.waitForTimeout(1200);
   await page.screenshot({path:`${output}/chromium-cpu4x-films.png`});
   const state=await page.evaluate(()=>({heading:getComputedStyle(document.querySelector('#films-title')).opacity,pending:document.querySelector('#films-title').dataset.scrollReveal,ready:document.querySelector('[data-background-video]').dataset.ready,characterTime:document.querySelector('.lh-film-character video')?.currentTime}));
   checks.push({engine:name,scenario:'4x CPU, settled',...state});
   assert.ok(Number(state.heading)>.99,'Throttled heading must eventually remain readable');
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});
   await save();
  }
 }finally{await browser.close();}
}
await save();
assert.deepEqual(failures,[]);
