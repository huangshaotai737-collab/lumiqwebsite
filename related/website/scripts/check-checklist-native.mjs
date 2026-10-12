import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://localhost:4226';
const session=process.env.SAFARI_SESSION;
const driver=process.env.SAFARI_DRIVER||'http://localhost:9235';
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-checklist-safari';
assert.ok(session);await fs.mkdir(out,{recursive:true});
async function call(path,body,method='POST'){
 const res=await fetch(`${driver}/session/${session}/${path}`,{method,headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 const {value}=await res.json();if(value?.error)throw Error(`${value.error}: ${value.message}`);return value;
}
const js=(script,args=[])=>call('execute/sync',{script,args});
const asyncJS=script=>call('execute/async',{script:`const done=arguments[arguments.length-1];(async()=>{${script}})().then(done,e=>done({error:String(e)}));`,args:[]});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const failures=[],checks=[],routes=[],layouts=[];
async function until(script,timeout=25000){const end=Date.now()+timeout;do{if(await js(script))return;await delay(100);}while(Date.now()<end);throw Error(`Timed out: ${script}`);}
async function check(name,fn){try{const evidence=await fn();checks.push({name,evidence});console.log(`PASS ${name}`);}catch(e){failures.push({name,error:e.message});console.log(`FAIL ${name}: ${e.message}`);}}
const screenshot=async name=>fs.writeFile(`${out}/${name}.png`,Buffer.from(await call('screenshot',undefined,'GET'),'base64'));
const open=async route=>{await call('url',{url:`${base}${route}`});await until('return document.querySelector("main")');await delay(250);};
await call('timeouts',{script:180000,pageLoad:60000,implicit:0});
await call('window/rect',{width:1440,height:1000});
const paths=['','/products','/products/ola','/products/ola-go','/products/tablet','/products/print','/products/nest','/products/book','/products/pal','/story','/about','/plans','/faq','/prelaunch','/contact','/legal/privacy','/legal/terms','/legal/cookies','/legal/child-safety','/members'];
if(!process.env.FOCUSED)for(const locale of ['en','zh-hant','ja'])for(const path of paths){
 await check(`native Safari font stability ${locale}${path||'/'}`,async()=>{
  await open(`/${locale}${path}`);
  const report=await asyncJS(`
   const main=document.querySelector('main'),wait=ms=>new Promise(r=>setTimeout(r,ms));
   const elements=[...main.querySelectorAll('h1,h2,h3,h4,p')].filter(e=>!e.closest('[aria-live],.glass-sample-content')).slice(0,180);
   const seen=new Map(),shifts=[];
   function sample(){for(const e of elements){
    const s=getComputedStyle(e),b=e.getBoundingClientRect();if(!b.width||!b.height)continue;
    const metric={text:e.textContent,font:s.fontFamily,size:s.fontSize,spacing:s.letterSpacing,width:e.offsetWidth,height:e.offsetHeight};
    const previous=seen.get(e);
    if(previous&&previous.text===metric.text&&(previous.font!==metric.font||previous.size!==metric.size||previous.spacing!==metric.spacing))shifts.push({before:previous,after:metric});
    seen.set(e,metric);
   }}
   sample();await wait(120);sample();await wait(900);sample();
   let sections=0;for(const section of main.querySelectorAll('section')){section.scrollIntoView({block:'start',behavior:'instant'});sample();await wait(760);sample();sections++;}
   return {blocks:seen.size,sections,shifts,splitWords:main.querySelectorAll('.scroll-word').length,remoteFonts:document.querySelectorAll('link[href*="fonts.googleapis.com"]').length,overflow:document.documentElement.scrollWidth>innerWidth+1};
  `);
  assert.ok(!report.error,report.error);assert.equal(report.shifts.length,0);assert.equal(report.splitWords,0);assert.equal(report.remoteFonts,0);assert.equal(report.overflow,false);
  routes.push({locale,path,...report});return {blocks:report.blocks,sections:report.sections};
 });
}
const major=['','/products','/products/ola','/products/ola-go','/products/tablet','/products/print','/products/nest','/story','/plans','/faq','/members'];
if(!process.env.FOCUSED)for(const locale of ['en','zh-hant','ja'])for(const path of major){
 await check(`native Safari responsive layout ${locale}${path||'/'}`,async()=>{
  await open(`/${locale}${path}`);const reports=[];
  for(const size of [{width:768,height:1024},{width:1280,height:720},{width:1440,height:1000},{width:2435,height:498},{width:3440,height:1440}]){
   await call('window/rect',size);await delay(180);
   const state=await js(`
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const intersects=(a,b)=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1;
    const blocks=[...document.querySelectorAll('.pd-product-tagline,.pd-hero-lede,.pd-concept-note,.pd-hero-display-title')].filter(visible).map(e=>e.getBoundingClientRect());
    const root=document.querySelector('.product-detail-light');
    const wrongColor=root?[...root.querySelectorAll('*')].filter(e=>visible(e)&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&getComputedStyle(e).color!=='rgb(255, 255, 255)'&&getComputedStyle(e).webkitTextFillColor!=='rgb(255, 255, 255)').map(e=>e.textContent.slice(0,40)):[];
    const member=document.querySelector('.members-heading h1');
    return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1,overlap:blocks.some((a,i)=>blocks.slice(i+1).some(b=>intersects(a,b))),wrongColor,memberWhite:!member||getComputedStyle(member).color==='rgb(255, 255, 255)',legacy:document.querySelectorAll('.lh-glass-word,.lh-hero-object,.lh-brand-character').length};
   `);
   layouts.push({locale,path,requested:size,...state});reports.push(state);
   assert.equal(state.overflow,false,JSON.stringify(state));assert.equal(state.overlap,false,JSON.stringify(state));assert.equal(state.wrongColor.length,0,JSON.stringify(state));assert.equal(state.memberWhite,true);assert.equal(state.legacy,0);
  }return reports;
 });
}
await call('window/rect',{width:1440,height:1000});
await open('/zh-hant');
await until('return document.querySelector(".lh-home")?.dataset.homeState==="open"');
await check('desktop navigation uses 17px and members precedes FAQ',async()=>{
 const data=await js(`const nav=document.querySelector('.site-desktop-nav');return {font:getComputedStyle(nav.querySelector('a')).fontSize,hrefs:[...nav.querySelectorAll('a')].map(a=>a.pathname)};`);
 assert.equal(data.font,'17px');assert.ok(data.hrefs.findIndex(h=>h.endsWith('/members'))<data.hrefs.findIndex(h=>h.endsWith('/faq')));await screenshot('nav-after');return data;
});
await check('all five native Safari product cards have centered names and left aligned copy',async()=>{
 await js(`document.querySelector('.lh-products-stage').scrollIntoView({block:'center',behavior:'instant'})`);await delay(1400);const data=[];
 for(let i=0;i<5;i++){
  const item=await js(`const c=document.querySelector('.glass-sample-content[data-active="true"]'),t=c.querySelector('[data-card-title]'),copy=c.querySelector('[data-card-copy]'),p=c.querySelector('p'),a=t.getBoundingClientRect(),b=copy.getBoundingClientRect();return {title:t.textContent,centerError:Math.abs(a.left+a.width/2-b.left-b.width/2),align:getComputedStyle(p).textAlign,fits:p.scrollWidth<=p.clientWidth+1};`);
  assert.ok(item.centerError<1);assert.equal(item.align,'left');assert.equal(item.fits,true);data.push(item);
  if(i===0)await screenshot('carousel-after');
  await js(`document.querySelector('.glass-sample-content[data-offset="1"] .glass-product-hit').click()`);await delay(550);
 }return data;
});
await check('native Safari room layer stays inside its section on reverse scroll',async()=>{
 await js(`const r=document.querySelector('.lh-room-section');window.scrollTo({top:scrollY+r.getBoundingClientRect().bottom+100,behavior:'instant'})`);await delay(300);
 const evidence=[];
 for(const fraction of [.9,.5,.1]){
  await js(`const r=document.querySelector('.lh-room-section');window.scrollTo({top:scrollY+r.getBoundingClientRect().top+r.clientHeight*${fraction}-innerHeight*.6,behavior:'instant'})`);await delay(800);
  const state=await js(`const s=document.querySelector('.lh-room-section').getBoundingClientRect(),r=document.querySelector('.lh-room-layout').getBoundingClientRect(),n=document.querySelector('.lh-safety').getBoundingClientRect();return {layoutTop:r.top,layoutBottom:r.bottom,sectionTop:s.top,sectionBottom:s.bottom,nextTop:n.top,position:getComputedStyle(document.querySelector('.lh-room-layout')).position};`);
  assert.ok(state.layoutBottom<=state.sectionBottom+1,JSON.stringify(state));assert.ok(state.layoutBottom<=state.nextTop+1,JSON.stringify(state));evidence.push(state);
 }await screenshot('room-after');return evidence;
});
await check('Safari background seek stays visible and freezes when scrolling stops',async()=>{
 await until('return document.querySelector("[data-background-video]")?.dataset.ready==="true"');
 const bounds=await js(`const v=document.querySelector('[data-background-video]');return {start:+v.dataset.scrollStart,end:+v.dataset.scrollEnd,duration:v.duration};`),samples=[];
 for(const fraction of [0,.35,.7,1,.35,0]){
  await js(`window.scrollTo({top:${bounds.start+(bounds.end-bounds.start)*fraction},behavior:'instant'})`);
  await until(`const v=document.querySelector('[data-background-video]');return !v.seeking&&v.readyState>=2`);await delay(250);
  const state=await js(`const v=document.querySelector('[data-background-video]');return {time:v.currentTime,ready:v.dataset.ready,opacity:v.style.opacity,paused:v.paused,error:v.error?.message};`);
  assert.equal(state.ready,'true');assert.equal(state.opacity,'1');assert.equal(state.paused,true);assert.ok(!state.error);samples.push(state);
 }
 assert.ok(samples[3].time>29&&samples.at(-1).time<.1,JSON.stringify(samples));
 await delay(400);assert.equal(await js(`return document.querySelector('[data-background-video]').currentTime`),samples.at(-1).time);
 return samples;
});
await check('Safari footer never overlaps waitlist consent after fast resizing',async()=>{
 const data=[];
 for(const size of [{width:768,height:1024},{width:2435,height:498},{width:1440,height:1000},{width:3440,height:1440},{width:1440,height:1000}]){
  await call('window/rect',size);await delay(120);await js('window.scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');await delay(850);
  const state=await js(`const f=document.querySelector('.footer').getBoundingClientRect(),c=document.querySelector('#join .lh-consent').getBoundingClientRect();return {gap:f.top-c.bottom,overflow:document.documentElement.scrollWidth>innerWidth+1,font:getComputedStyle(document.querySelector('.foot-nav a')).fontSize,headingColor:getComputedStyle(document.querySelector('.foot-nav h4')).color};`);
  assert.ok(state.gap>=0,JSON.stringify(state));assert.equal(state.overflow,false);assert.ok(parseFloat(state.font)>=16);data.push(state);
 }await screenshot('footer-after');return data;
});
await open('/zh-hant/story');await js('window.scrollTo({top:0,behavior:"instant"})');await delay(800);await screenshot('story-after');
await check('Safari story text is at least 16px',async()=>{const font=await js(`return getComputedStyle(document.querySelector('.story-hero-copy > p')).fontSize`);assert.ok(parseFloat(font)>=16);return {font};});
for(const locale of ['en','zh-hant','ja']){
 await open(`/${locale}/products/ola-go`);
 await check(`distinct Ola Go story and closing headings ${locale}`,async()=>{const text=await js(`return [document.querySelector('.pd-story-floor h2').textContent.trim(),document.querySelector('.pd-final-inner h2').textContent.trim()]`);assert.notEqual(text[0],text[1]);return text;});
 if(locale==='zh-hant'){await js(`document.querySelector('.pd-final-inner').scrollIntoView({block:'center',behavior:'instant'})`);await delay(850);await screenshot('ola-go-copy-after');}
}
await open('/zh-hant/products/tablet');await delay(1000);await screenshot('tablet-after');
await check('Safari product background remains fixed during scrolling',async()=>{
 const geometry=()=>js(`const s=getComputedStyle(document.querySelector('.product-detail-light'),'::before');return {position:s.position,top:s.top,left:s.left,width:s.width,height:s.height,background:s.backgroundImage,transform:s.transform};`);
 const a=await geometry();assert.equal(a.position,'fixed');assert.ok(a.background.includes('/slate-backgrounds-20261012/product-detail.png'));
 await js(`document.querySelector('.pd-story-floor').scrollIntoView({block:'center',behavior:'instant'})`);await delay(850);const b=await geometry();assert.deepEqual(a,b);await screenshot('tablet-story-after');return {a,b};
});
await open('/zh-hant/members');await delay(900);await screenshot('members-after');
await fs.writeFile(`${out}/report.json`,JSON.stringify({base,checks,routes,layouts,failures},null,2));
console.log(`Native Safari: ${routes.length} font routes, ${layouts.length} layout cases, ${failures.length} failures`);
assert.deepEqual(failures,[]);
