import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.SITE_URL||'http://localhost:4229';
const driver=process.env.SAFARI_DRIVER||'http://localhost:9235';
const session=process.env.SAFARI_SESSION;
if(!session)throw Error('Pass the user-enabled SAFARI_SESSION.');
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-home-anchor-native';
await fs.mkdir(out,{recursive:true});
async function command(path,body,method='POST'){
 const response=await fetch(`${driver}/session/${session}/${path}`,{method,signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json'},...(method==='GET'?{}:{body:JSON.stringify(body)})});
 const {value}=await response.json();if(value?.error)throw Error(`${value.error}: ${value.message}`);return value;
}
const js=script=>command('execute/sync',{script,args:[]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function ready(){
 const end=Date.now()+20000;
 while(Date.now()<end){if(await js("return !!document.querySelector('.lh-home[data-home-state=\"open\"]') && !!document.querySelector('#products') && document.fonts.status==='loaded'")){await sleep(1000);return;}await sleep(100);}
 throw Error('Homepage failed to hydrate.');
}
const state=()=>js("const e=document.getElementById('products'),r=e.getBoundingClientRect();return {width:innerWidth,height:innerHeight,y:scrollY,top:r.top,bottom:r.bottom,hash:location.hash,overflow:document.documentElement.scrollWidth>innerWidth+1};");
const aligned=async label=>{const s=await state();assert(s.top<160&&s.bottom>160,`${label}: ${JSON.stringify(s)}`);assert.equal(s.overflow,false);return s;};
const arrow = async value => {
 await js("document.querySelector('.lh-home').focus({preventScroll:true});return true");
 return command('actions',{actions:[{type:'key',id:'anchor-keyboard',actions:[{type:'keyDown',value},{type:'keyUp',value}]}]});
};
const results=[],failures=[];
for(const locale of ['en','zh-hant','ja']){
 try{
  await command('window/rect',{width:500,height:1000});
  await command('url',{url:`${base}/${locale}/faq`});
  // The reusable driver has pageLoadStrategy=none. Wait for the first
  // document to commit before issuing another cross-document navigation.
  const faqDeadline=Date.now()+20000;
  while(Date.now()<faqDeadline){if(await js("return location.pathname.endsWith('/faq') && !document.querySelector('.lh-home') && document.readyState==='complete'"))break;await sleep(100);}
  assert.equal(await js("return location.pathname.endsWith('/faq') && !document.querySelector('.lh-home')"),true);
  await command('url',{url:`${base}/${locale}#products`});await ready();await aligned('narrow entry');
  const widths=[];
  for(const width of [768,1100,1101,1440,2435,3440,500,1440]){
   await command('window/rect',{width,height:1000});await sleep(700);widths.push(await aligned(`resize ${width}`));
   if(locale==='zh-hant'&&width===2435){const png=await command('screenshot',undefined,'GET');await fs.writeFile(`${out}/native-safari-wide-after.png`,Buffer.from(png,'base64'));}
  }
  await command('refresh',{});await ready();const refreshed=await aligned('wide refresh');
  await js("document.querySelector('.site-desktop-nav a[href$=\"/faq\"]').click()");
  const end=Date.now()+20000;
  while(Date.now()<end){if(await js("return location.pathname.endsWith('/faq') && !document.querySelector('.lh-home')"))break;await sleep(100);}
  assert.equal(await js("return location.pathname.endsWith('/faq') && !document.querySelector('.lh-home')"),true);
  // Safari's driver back endpoint can skip same-document SPA entries. Exercise
  // the browser's history operation directly, retaining the native renderer.
  await js('history.back();return true');await ready();const returned=await aligned('browser back');
  await arrow('\uE015');await sleep(600);const heightBefore=await state();
  await command('window/rect',{width:1440,height:800});await sleep(1200);const heightAfter=await state();
  assert(Math.abs(heightAfter.top-heightBefore.top)<2,`Manual reading moved after height resize: ${JSON.stringify({heightBefore,heightAfter})}`);
  await command('window/rect',{width:500,height:1000});await command('refresh',{});await ready();await aligned('fresh narrow entry');
  await arrow('\uE013');await sleep(600);const widthBefore=await state();
  await command('window/rect',{width:1440,height:1000});await sleep(1200);const widthAfter=await state();
  assert(Math.abs(widthAfter.top-widthBefore.top)<2,`Manual reading moved after width resize: ${JSON.stringify({widthBefore,widthAfter})}`);
  results.push({locale,widths,refreshed,returned,heightBefore,heightAfter,widthBefore,widthAfter});console.log(`PASS native Safari ${locale}: resize, refresh, browser back, manual height/width resize`);
 }catch(e){failures.push({locale,error:e.message});console.log(`FAIL native Safari ${locale}: ${e.message}`);}
}
await fs.writeFile(`${out}/report.json`,JSON.stringify({base,results,failures},null,2));
assert.deepEqual(failures,[]);
