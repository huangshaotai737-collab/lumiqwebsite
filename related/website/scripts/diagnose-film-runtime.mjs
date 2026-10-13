import fs from 'node:fs/promises';
import {chromium,firefox,webkit} from '@playwright/test';

const base=process.env.SITE_URL||'http://localhost:4233';
const engine=process.env.ENGINE||'firefox';
const output=process.env.QA_OUTPUT||'/private/tmp/lumiq-film-runtime-diagnosis';
await fs.mkdir(output,{recursive:true});
const browser=await ({chromium,firefox,webkit}[engine]).launch({headless:process.env.HEADED!=='1',...(engine==='chromium'&&process.env.CHROME_SYSTEM==='1'?{channel:'chrome'}:{})});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.goto(`${base}/zh-hant`,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open');
 await page.waitForTimeout(1200);
 for(const viewport of [{width:1440,height:900},{width:3440,height:1440}]) {
  await page.setViewportSize(viewport);await page.waitForTimeout(500);
  await page.evaluate(()=>document.querySelector('.lh-films-stage').scrollIntoView({block:'center',behavior:'instant'}));
  await page.waitForFunction(()=>{const v=document.querySelector('.lh-film-character video');return v?.readyState>=2&&v?.currentTime>.5;},null,{timeout:25000});
  for(const scenario of ['normal','girl-paused','background-frozen','both-frozen','normal-after-warm']) {
   const data=await page.evaluate(async scenario=>{
    const girl=document.querySelector('.lh-film-character video');
    const background=document.querySelector('[data-background-video]');
    const stage=document.querySelector('.lh-films-stage');
    const y=scrollY+stage.getBoundingClientRect().top-(innerHeight-stage.clientHeight)/2;
    scrollTo({top:y,behavior:'instant'});
    delete background.seeking;
    const freezeGirl=scenario==='girl-paused'||scenario==='both-frozen';
    const freezeBackground=scenario==='background-frozen'||scenario==='both-frozen';
    if(freezeGirl)girl.pause();else{girl.currentTime=1;await girl.play();}
    if(freezeBackground)Object.defineProperty(background,'seeking',{configurable:true,get:()=>true});
    await new Promise(resolve=>setTimeout(resolve,400));
    const before=girl.currentTime;
    return await new Promise(resolve=>{
     const start=performance.now(),frames=[];let last=start;
     function frame(t){
      const progress=Math.min(1,(t-start)/2000);
      scrollTo({top:y+Math.sin(progress*Math.PI*2)*innerHeight*.09,behavior:'instant'});
      frames.push(t-last);last=t;
      if(progress<1)requestAnimationFrame(frame);else resolve({frames,before,after:girl.currentTime,paused:girl.paused,backgroundTime:background.currentTime});
     }
     requestAnimationFrame(frame);
    });
   },scenario);
   const intervals=data.frames.slice(1).sort((a,b)=>a-b);
   const result={engine,version:browser.version(),viewport,scenario,frames:data.frames.length,p50:intervals[Math.floor(intervals.length*.5)],p95:intervals[Math.floor(intervals.length*.95)],max:Math.max(...intervals),before:data.before,after:data.after,paused:data.paused,backgroundTime:data.backgroundTime};
   results.push(result);console.log(JSON.stringify(result));
   await fs.writeFile(`${output}/${engine}-diagnosis.json`,JSON.stringify(results,null,2));
  }
 }
}finally{await browser.close();}
