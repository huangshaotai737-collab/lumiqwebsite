import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4195';
const output = process.env.EVIDENCE_DIR || '/private/tmp/lumiq-site-background-flow-evidence';
await fs.mkdir(output,{recursive:true});
const browser = await chromium.launch({channel:'chrome',headless:true});
const reports=[];
const pageErrors=[];
const track=page=>page.on('pageerror',error=>pageErrors.push(String(error)));
const goto=async(page,route)=>{
 const response=await page.goto(`${base}/${route}`,{waitUntil:'domcontentloaded'});
 assert.equal(response.status(),200,route);
 await page.waitForSelector('main h1');
 await page.waitForSelector('[data-background-video]',{state:'attached',timeout:15000});
 assert.equal(await page.locator('[data-background-video]').count(),1,`${route}: exactly one shared scroll background movie`);
 await page.evaluate(()=>document.fonts.ready);
};
const state=page=>page.evaluate(()=>{
 const root=document.querySelector('.lumiq-root[data-site-flow]');
 const v=root.querySelector('[data-background-video]');
 return {y:scrollY,end:document.documentElement.scrollHeight-innerHeight,time:v.currentTime,seeking:v.seeking,ready:v.dataset.ready,tone:root.dataset.siteFlowTone,cues:JSON.parse(v.dataset.scrollCues),height:document.querySelector('main').getBoundingClientRect().height,ink:getComputedStyle(document.querySelector('main')).color,overflow:document.documentElement.scrollWidth>innerWidth};
});
const move=async(page,p)=>{
 await page.evaluate(p=>scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*p,behavior:'instant'}),p);
 await page.waitForFunction(p=>{const v=document.querySelector('[data-background-video]');return !v.seeking&&v.dataset.ready==='true'&&Math.abs(v.currentTime-p*30)<.3},p,{timeout:20000});
 await page.waitForTimeout(200);
 return state(page);
};
const screenshot=async(page,name)=>{await page.waitForTimeout(700);await page.screenshot({path:`${output}/${name}.png`});};
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});track(page);
 const routes=['en/story','en/products','en/products/ola','en/products/tablet','en/products/ola-go','en/products/nest','en/products/print','en/plans','en/members','en/faq','en/about','en/contact','en/legal/privacy','en/legal/terms','en/legal/cookies','en/legal/child-safety','en/prelaunch','zh-hant/story','ja/products/ola','zh-hant/plans','ja/faq'];
 for(const route of routes){
  await goto(page,route);
  const initial=await move(page,0);
  assert(initial.time<.2&&initial.tone==='light',`${route}: resets to the pearl frame`);
  assert.equal(initial.cues.length,0,`${route}: uses native whole-page progress`);
  assert(!initial.overflow,`${route}: fits viewport`);
  if(route==='en/story'){
   // Reconstruct the previous static presentation by disabling only new styling.
   // No document or media changes; name records that this is a CSS comparison.
   await page.evaluate(()=>{const r=document.querySelector('.lumiq-root[data-site-flow]');r.removeAttribute('data-site-flow');r.querySelector('.bg-layer').style.display='none'});
   await screenshot(page,'品牌-旧静态CSS对比');
   await page.evaluate(()=>{const r=document.querySelector('.locale-en');r.setAttribute('data-site-flow','');r.querySelector('.bg-layer').style.display=''});
  }
  if(['en/story','en/products/ola','en/members'].includes(route))await screenshot(page,`${route.replaceAll('/','-')}-浅色`);
  const dark=await move(page,.85);
  assert(dark.time>24&&dark.tone==='dark',`${route}: native scrolling advances into dark frames`);
  assert.equal(dark.ink,'rgb(247, 248, 252)',`${route}: exposed copy uses light ink`);
  if(['en/story','en/plans','en/products/ola','en/members','en/faq'].includes(route))await screenshot(page,`${route.replaceAll('/','-')}-深色`);
  if(route.endsWith('/story')){
   for(const selector of ['.story-future-copy h2','.story-future-copy p','.story-collection a']){
    const color=await page.locator(selector).first().evaluate(e=>getComputedStyle(e).color);
    assert(['rgb(21, 36, 57)','rgb(64, 83, 108)'].includes(color),`${selector}: pale future panel retains dark text`);
   }
  }
  if(route==='en/prelaunch')assert.equal(await page.locator('.prelaunch-form input').first().evaluate(e=>getComputedStyle(e).color),'rgb(21, 36, 57)');
  const back=await move(page,.2);
  assert(back.time<8&&back.tone==='light',`${route}: reverse scrolling restores pearl/light palette`);
  const restored=await move(page,0);
  assert(Math.abs(restored.height-initial.height)<2,`${route}: background leaves document geometry stable`);
  reports.push({route,initial,dark,back});
  console.log('PASS',route);
 }
 // Guard bright surfaces without changing menu, price or form typography.
 await goto(page,'en/plans');await move(page,.85);
 for(const selector of ['.hw-price','.pal-table tbody th','.billing-toggle button:not(.on)']){
  const color=await page.locator(selector).first().evaluate(e=>getComputedStyle(e).color);
  assert(['rgb(21, 36, 57)','rgb(64, 83, 108)'].includes(color),`${selector}: dark ink remains on pale surfaces`);
 }
 await page.locator('.billing-toggle button').nth(1).click();
 assert.equal(await page.locator('.billing-toggle button').nth(1).getAttribute('aria-pressed'),'true');
 await goto(page,'en/faq');await move(page,.85);
 assert.equal(await page.locator('.faq-search input').evaluate(e=>getComputedStyle(e).color),'rgb(21, 36, 57)');
 await page.locator('.faq-q').nth(1).click();assert.equal(await page.locator('.faq-q').nth(1).getAttribute('aria-expanded'),'true');
 await goto(page,'en/products/ola');await move(page,.85);
 assert.equal(await page.locator('.pd-price').first().evaluate(e=>getComputedStyle(e).color),'rgb(21, 36, 57)');
 assert.equal(await page.locator('.pd-hero-display-title').first().evaluate(e=>getComputedStyle(e).webkitTextFillColor),'rgb(247, 248, 252)');
 // Seek requests change currentTime before decoding. Keep the last frame's tone.
 const seeks=await page.evaluate(async()=>{
  const v=document.querySelector('[data-background-video]'),r=document.querySelector('.lumiq-root[data-site-flow]');
  const frames=[];let done=false;
  const sample=()=>frames.push({seeking:v.seeking,tone:r.dataset.siteFlowTone,time:v.currentTime});
  const capture=()=>{sample();if(!done)requestAnimationFrame(capture)};
  v.addEventListener('seeking',sample);v.addEventListener('seeked',sample);capture();
  for(const fraction of [0,1,0,1]){scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*fraction,behavior:'instant'});await new Promise(resolve=>setTimeout(resolve,100))}
  await new Promise(resolve=>setTimeout(resolve,500));done=true;v.removeEventListener('seeking',sample);v.removeEventListener('seeked',sample);return frames;
 });
 let settled='dark',pending=0;
 for(const f of seeks){if(f.seeking){pending++;assert.equal(f.tone,settled,'pending seeks preserve the last decoded tone')}else settled=f.tone}
 assert(pending>0,'rapid-jump check exercised asynchronous seeking');
 // Persistent layout keeps one movie/cache through client navigation.
 await goto(page,'en/story');await move(page,1);
 await page.evaluate(()=>{window.__flowMovie=document.querySelector('[data-background-video]')});
 await page.locator('.site-nav a[href="/en/plans"]').first().click();
 await page.waitForURL('**/en/plans');await page.waitForSelector('.plans-page');
 await move(page,0);
 assert(await page.evaluate(()=>window.__flowMovie===document.querySelector('[data-background-video]')),'client navigation reuses one media element');
 await page.goBack();await page.waitForSelector('.story-page');await move(page,0);
 await page.goForward();await page.waitForSelector('.plans-page');await move(page,0);
 assert.equal(await page.locator('[data-background-video]').count(),1);
 await move(page,1);
 await page.evaluate(()=>{
  window.__homeRouteFrames=[];window.__captureHomeRoute=true;
  const sample=()=>{const v=document.querySelector('[data-background-video]');if(document.querySelector('.lh-home'))window.__homeRouteFrames.push({seeking:v.seeking,time:v.currentTime,opacity:v.style.opacity,ready:v.dataset.ready});if(window.__captureHomeRoute)requestAnimationFrame(sample)};sample();
 });
 await page.locator('.site-nav a[href="/en"]').first().click();
 await page.waitForSelector('.lh-home');
 await page.waitForFunction(()=>{const v=document.querySelector('[data-background-video]');return JSON.parse(v.dataset.scrollCues).length>0&&!v.seeking&&v.currentTime<.2&&v.dataset.ready==='true'});
 const homeRoute=await page.evaluate(()=>{window.__captureHomeRoute=false;return {frames:window.__homeRouteFrames,same:window.__flowMovie===document.querySelector('[data-background-video]'),cues:JSON.parse(document.querySelector('[data-background-video]').dataset.scrollCues)}});
 assert(homeRoute.same,'inner-page to homepage retains the single cached movie');
 for(const f of homeRoute.frames)if(f.seeking||f.time>20)assert.equal(f.opacity,'0','previous dark frame remains veiled during homepage restore');
 for(const t of [0,6,12,18,24,30])assert(homeRoute.cues.some(c=>c[1]===t),`homepage preserves chapter cue ${t}`);
 reports.push({mode:'client-navigation',homeRoute,seeks});
 await page.close();
 const fresh=await browser.newPage({viewport:{width:1710,height:545}});track(fresh);
 await fresh.goto(`${base}/zh-hant`,{waitUntil:'domcontentloaded'});
 await fresh.waitForSelector('[data-background-video]',{state:'attached'});
 await fresh.waitForFunction(()=>document.querySelector('.lh-opening').hasAttribute('data-video-mode'));
 await fresh.waitForTimeout(300);
 assert.equal(await fresh.locator('[data-background-video]').getAttribute('src'),null,'fresh homepage still defers the backdrop movie');
 await fresh.waitForFunction(()=>document.querySelector('.lh-video-layer').dataset.ready==='true');
 await screenshot(fresh,'首页-1710x545-首帧');
 const start=await fresh.locator('[data-background-video]').evaluate(v=>Number(v.dataset.scrollStart));
 await fresh.evaluate(y=>scrollTo({top:y+273,behavior:'instant'}),start);
 await fresh.waitForFunction(()=>document.querySelector('[data-background-video]').dataset.ready==='true');
 await fresh.waitForTimeout(1500);await screenshot(fresh,'首页-1710x545-产品交接');
 await fresh.close();
 for(const [label,options] of [['手机',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['减少动态',{viewport:{width:1440,height:900},reducedMotion:'reduce'}]]){
  const p=await browser.newPage(options);track(p);
  for(const route of ['zh-hant/products/ola','ja/faq','en/members']){
   await goto(p,route);
   await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await p.waitForTimeout(200);
   assert.equal(await p.locator('[data-background-video]').getAttribute('src'),null,`${label}: no movie transfer`);
   const s=await state(p);assert.equal(s.tone,'light');assert(!s.overflow,`${label}/${route}: no horizontal overflow`);
   await screenshot(p,`${label}-${route.replaceAll('/','-')}`);
   reports.push({route,mode:label,state:s});
  }
  await p.close();
 }
 assert.deepEqual(pageErrors,[],'no route runtime errors');
 console.log('PASS: route coverage, forward/reverse darkening, decoded tone, client navigation, prices/forms/links/buttons, mobile/reduced fallback');
 await fs.writeFile(`${output}/验证记录.json`,JSON.stringify({reports,pageErrors,comparison:'旧静态CSS对比 screenshot disables only the new data-site-flow styles; approved media remain unchanged.'},null,2));
} finally {await browser.close()}
