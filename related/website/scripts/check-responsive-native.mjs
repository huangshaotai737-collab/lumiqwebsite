import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.SITE_URL||'http://localhost:4233';
const driver=process.env.SAFARI_DRIVER||'http://localhost:9235';
const session=process.env.SAFARI_SESSION;
assert(session,'SAFARI_SESSION is required');
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-responsive-native';
await fs.mkdir(out,{recursive:true});
async function command(path,body,method='POST'){
 const r=await fetch(`${driver}/session/${session}/${path}`,{method,signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 const {value}=await r.json();if(value?.error)throw Error(`${value.error}: ${value.message}`);return value;
}
const js=script=>command('execute/sync',{script,args:[]});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function ready(path,token){
 const end=Date.now()+60000;
 while(Date.now()<end){if(await js(`return location.pathname===${JSON.stringify(path)}&&new URLSearchParams(location.search).get('native-audit')===${JSON.stringify(token)}&&document.querySelector('main')&&document.fonts.status==='loaded'&&document.readyState==='complete'`)){await sleep(500);return;}await sleep(150);}
 throw Error(`Not ready: ${path}`);
}
const results=[],failures=[];
async function record(name,action){try{results.push({name,...await action()});console.log(`PASS native Safari ${name}`);}catch(e){failures.push({name,error:e.message});console.log(`FAIL native Safari ${name}: ${e.message}`);}await fs.writeFile(`${out}/report.json`,JSON.stringify({base,results,failures},null,2));}
for(const width of [500,768,820,1043,1100,1440,2435])await record(`hero ${width}`,async()=>{
 const token=`hero-${width}-${Date.now()}`;
 await command('window/rect',{width,height:1255});await command('url',{url:`${base}/zh-hant?native-audit=${token}`});await ready('/zh-hant',token);
 await js('scrollTo(0,0);return true');await sleep(700);
 const state=await js("const a=document.querySelector('.lh-mobile-hero-art'),c=document.querySelector('.lh-hero-copy'),img=a.querySelector('img'),r=a.getBoundingClientRect(),p=c.getBoundingClientRect();return{width:innerWidth,contentWidth:document.documentElement.clientWidth,height:innerHeight,narrow:matchMedia('(max-width: 1100px)').matches,tablet:matchMedia('(min-width: 768px) and (max-width: 1100px)').matches,art:{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height},copy:{left:p.left,right:p.right,top:p.top,bottom:p.bottom},painted:getComputedStyle(img).objectFit==='contain'?Math.min(r.width,r.height*img.naturalWidth/img.naturalHeight):r.width,overflow:document.documentElement.scrollWidth>innerWidth+1,src:img.currentSrc};");
 assert(!state.overflow,JSON.stringify(state));assert(state.copy.left>=18,JSON.stringify(state));assert(state.copy.right<=state.width-18,JSON.stringify(state));
 if(state.narrow){assert(state.painted>=state.contentWidth-2,JSON.stringify(state));if(state.tablet)assert(state.art.top>=state.copy.bottom-1,JSON.stringify(state));}
 if(width===1043){const png=await command('screenshot',undefined,'GET');await fs.writeFile(`${out}/safari-tablet-after.png`,Buffer.from(png,'base64'));}
 return state;
});
for(const locale of ['en','zh-hant','ja'])for(const route of ['', '/products','/products/tablet','/products/ola','/products/ola-go','/products/print','/products/nest','/story','/plans','/faq','/members'])await record(`footer ${locale}${route}`,async()=>{
 const token=`footer-${locale}${route}-${Date.now()}`;
 await command('window/rect',{width:1440,height:900});await command('url',{url:`${base}/${locale}${route}?native-audit=${token}`});await ready(`/${locale}${route}`,token);
 if(!route){const end=Date.now()+60000;while(!(await js("return document.querySelector('.lh-home')?.dataset.homeState==='open'"))){assert(Date.now()<end,'Home did not become ready');await sleep(100);}}
 // Lazy responsive media can change document height after the first scroll.
 // Use an instant scroll, then verify the bottom rather than sample mid-motion.
 for(let attempt=0;attempt<20;attempt++){
  await js("scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'});return true");await sleep(200);
  if(await js('return Math.abs(document.documentElement.scrollHeight-scrollY-innerHeight)<2'))break;
 }
 const state=await js("const f=document.querySelector('.footer'),r=f?.getBoundingClientRect(),s=f&&getComputedStyle(f);return{width:innerWidth,footer:!!f,top:r?.top,bottom:r?.bottom,display:s?.display,visibility:s?.visibility,opacity:s?.opacity,overflow:document.documentElement.scrollWidth>innerWidth+1};");
 assert(state.footer&&state.display!=='none'&&state.visibility!=='hidden'&&Number(state.opacity)>0);assert(state.top<900&&state.bottom>0);assert(!state.overflow);return state;
});
assert.deepEqual(failures,[]);
