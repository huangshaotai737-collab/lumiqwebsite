import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import {chromium, firefox, webkit} from '@playwright/test';
import sharp from 'sharp';

const base = process.env.SITE_URL || 'http://localhost:4233';
const out = process.env.QA_OUTPUT || '/private/tmp/lumiq-motion-runtime-20261013';
const names = (process.env.ENGINES || 'chromium,firefox,webkit').split(',');
const locales = (process.env.LOCALES || 'en,zh-hant,ja').split(',');
const focused = process.env.FOCUSED === '1';
const viewports = [[320,740],[390,844],[820,1180],[1024,1280],[1100,1000],[1280,720],[1440,900],[2435,498],[3440,1440]].map(([width,height]) => ({width,height}));
const checks = [], failures = [];
await fs.mkdir(out, {recursive:true});
async function save() {
  await fs.writeFile(`${out}/motion-report.json`, JSON.stringify({base,platform:os.platform(),release:os.release(),checks,failures},null,2));
}
async function check(name, work) {
  try {const evidence = await work(); checks.push({name,evidence}); console.log(`PASS ${name}`,JSON.stringify(evidence));}
  catch (error) {failures.push({name,message:error.message}); console.log(`FAIL ${name}: ${error.message}`);}
  await save();
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelector('.lh-home')?.dataset.homeState === 'open',null,{timeout:40000});
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve,15000))]));
  await page.waitForTimeout(700);
}
async function filmCenter(page) {
  await page.evaluate(() => {
    const element = document.querySelector('.lh-films-stage');
    scrollTo({top:scrollY+element.getBoundingClientRect().top-(innerHeight-element.clientHeight)/2,behavior:'instant'});
  });
}
async function footerPaint(page) {
  for(let i=0;i<12;i++) {
    await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    await page.waitForTimeout(120);
    if(await page.evaluate(() => Math.abs(document.documentElement.scrollHeight-scrollY-innerHeight)<2))break;
  }
  const state = await page.evaluate(() => {
    const footer=document.querySelector('footer.footer'),r=footer.getBoundingClientRect();
    return {top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight,links:footer.querySelectorAll('a').length};
  });
  const image = await page.screenshot();
  await page.addStyleTag({content:'footer.footer .foot-grid,footer.footer .foot-bottom{visibility:hidden!important}', id:'motion-footer-hide'});
  await page.waitForTimeout(100);
  const hidden = await page.screenshot();
  await page.evaluate(() => [...document.querySelectorAll('style')].filter(e => e.textContent?.includes('motion-footer-hide') || e.textContent?.includes('footer.footer .foot-grid,footer.footer .foot-bottom{visibility:hidden!important}')).forEach(e => e.remove()));
  const region = {left:0,top:Math.ceil(Math.max(80,state.top)),width:state.width,height:Math.floor(Math.min(state.bottom,state.height))-Math.ceil(Math.max(80,state.top))};
  assert.ok(region.height>0, JSON.stringify(state));
  const a = await sharp(image).extract(region).removeAlpha().raw().toBuffer();
  const b = await sharp(hidden).extract(region).removeAlpha().raw().toBuffer();
  let painted = 0;
  for(let i=0;i<a.length;i+=3)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>24)painted++;
  assert.ok(painted>150 && state.links>=10, JSON.stringify({...state,painted}));
  return {...state,painted};
}
for(const name of names) {
  const browser = await ({chromium,firefox,webkit}[name]).launch({timeout:30000,headless:process.env.HEADED!=='1', ...(name==='chromium'&&process.env.CHROME_SYSTEM==='1'?{channel:'chrome'}:{})});
  try {
    for(const locale of locales) {
      const errors=[];
      const page=await browser.newPage({viewport:{width:1440,height:900}});
      page.setDefaultTimeout(25000);
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(() => {
        window.__motionEntries=[];window.__motionLongTasks=[];
        const original=Element.prototype.animate;
        Element.prototype.animate=function(frames,options) {
          window.__motionEntries.push({id:this.id,text:this.textContent?.slice(0,30),frames,options});
          return original.call(this,frames,options);
        };
        try {new PerformanceObserver(list=>window.__motionLongTasks.push(...list.getEntries().map(e=>({duration:e.duration,start:e.startTime})))).observe({type:'longtask',buffered:true});}catch {}
      });
      await page.goto(`${base}/${locale}`,{waitUntil:'domcontentloaded',timeout:60000});
      await ready(page);
      await check(`${name}/${locale}/first heading entry`, async() => {
        await filmCenter(page);
        try {
          await page.waitForFunction(() => {
            const title=document.querySelector('#films-title');
            return !title.dataset.scrollReveal && Number(getComputedStyle(title).opacity)>.99;
          },null,{timeout:15000,polling:100});
        }catch(error) {
          const detail=await page.evaluate(()=>{
            const title=document.querySelector('#films-title'),r=title.getBoundingClientRect();
            return {y:scrollY,rect:{top:r.top,bottom:r.bottom},opacity:getComputedStyle(title).opacity,pending:title.dataset.scrollReveal,entry:window.__motionEntries.find(e=>e.id==='films-title'),home:document.querySelector('.lh-home')?.dataset.homeState,loader:document.querySelector('.lh-loader')?.dataset.state};
          });
          await page.screenshot({path:`${out}/${name}-${locale}-first-heading-failure.png`});
          throw new Error(`${error.message} Evidence: ${JSON.stringify(detail)}`);
        }
        const state=await page.evaluate(() => {
          const title=document.querySelector('#films-title');
          return {entry:window.__motionEntries.find(e=>e.id==='films-title'),opacity:getComputedStyle(title).opacity,pending:title.dataset.scrollReveal,wraps:title.querySelectorAll('.scroll-word').length};
        });
        assert.ok(state.entry?.frames.some(f=>f.transform==='translateY(24px)'),JSON.stringify(state));
        assert.ok(Number(state.opacity)>.99);assert.equal(state.pending,undefined);assert.equal(state.wraps,0);
        return state;
      });
      for(const viewport of focused ? [] : viewports) {
        await check(`${name}/${locale}/${viewport.width}x${viewport.height}/forward-back-footer`,async() => {
          await page.setViewportSize(viewport);
          await page.waitForTimeout(450);
          await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
          await page.waitForTimeout(250);
          await filmCenter(page);
          await page.waitForTimeout(750);
          const state=await page.evaluate(() => {
            const title=document.querySelector('#films-title'),rect=title.getBoundingClientRect();
            const movie=document.querySelector('[data-background-video]');
            const girl=document.querySelector('.lh-film-character'),clip=girl.querySelector('video');
            return {overflow:document.documentElement.scrollWidth>innerWidth+1,title:{left:rect.left,right:rect.right,width:rect.width,opacity:getComputedStyle(title).opacity},background:{ready:movie?.dataset.ready,opacity:movie?.style.opacity,src:movie?.getAttribute('src'),time:movie?.currentTime,error:movie?.error?.code},girl:{visible:girl.dataset.visible,width:girl.getBoundingClientRect().width,left:girl.getBoundingClientRect().left,format:clip?.currentSrc,time:clip?.currentTime,paused:clip?.paused,error:clip?.error?.code,alphaVideo:girl.dataset.alphaVideo}};
          });
          assert.equal(state.overflow,false);assert.ok(Number(state.title.opacity)>.99);
          assert.ok(state.title.left>=-1 && state.title.right<=viewport.width+1,JSON.stringify(state));
          if(viewport.width<=1100)assert.ok(!state.background.src && state.girl.visible!=='true',JSON.stringify(state));
          const footer=await footerPaint(page);
          await filmCenter(page);await page.waitForTimeout(250);
          const after=await page.evaluate(() => ({pending:document.querySelector('#films-title').dataset.scrollReveal,opacity:getComputedStyle(document.querySelector('#films-title')).opacity,y:scrollY}));
          assert.equal(after.pending,undefined);assert.ok(Number(after.opacity)>.99);
          if(locale==='zh-hant'&&[1024,2435].includes(viewport.width))await page.screenshot({path:`${out}/${name}-${locale}-${viewport.width}-reverse-films.png`});
          return {viewport,...state,footer,after};
        });
      }
      if(!focused)await check(`${name}/${locale}/video-play-switch-pause`,async() => {
        await page.setViewportSize({width:1440,height:900});await filmCenter(page);await page.waitForTimeout(350);
        await page.locator('.lh-film-toggle').click();
        await page.waitForFunction(() => {const v=document.querySelector('.lh-film-card video');return !v.paused&&v.currentTime>.15;});
        const first=await page.locator('.lh-film-card video').evaluate(v=>({src:v.currentSrc,time:v.currentTime}));
        await page.locator('.lh-films-controls button').last().click();await page.waitForTimeout(900);
        assert.equal(await page.locator('.lh-film-card video').evaluate(v=>v.paused),true);
        await page.locator('.lh-film-toggle').click();
        await page.waitForFunction(first => {const v=document.querySelector('.lh-film-card video');return !v.paused&&v.currentTime>.15&&v.currentSrc!==first;},first.src);
        const next=await page.locator('.lh-film-card video').evaluate(v=>({src:v.currentSrc,time:v.currentTime}));
        await page.evaluate(() => scrollTo({top:0,behavior:'instant'}));
        await page.waitForFunction(() => document.querySelector('.lh-film-card video').paused);
        return {first,next,pausedOffscreen:true};
      });
      await check(`${name}/${locale}/client-route-back-refresh`,async() => {
        await page.goto(`${base}/${locale}/products`,{waitUntil:'domcontentloaded'});
        await page.locator('#product-tab-tablet').click();
        await page.locator('#product-tab-tablet').waitFor({state:'visible'});
        await page.waitForFunction(()=>document.querySelector('#product-tab-tablet')?.getAttribute('aria-selected')==='true');
        await page.locator('main a[href$="/products/tablet"][tabindex="0"]').click();
        await page.waitForURL(`**/${locale}/products/tablet`);
        await page.locator('.pd-story-copy h2').waitFor({state:'attached'});
        const title=await page.locator('.pd-story-copy h2').first().textContent();
        await page.evaluate(()=>{
          window.__motionEntries=[];
          document.querySelector('.pd-story-copy h2').scrollIntoView({block:'center',behavior:'instant'});
        });
        await page.waitForFunction(title=>window.__motionEntries.some(e=>e.text===title?.slice(0,30)),title);
        await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.pd-story-copy h2')).opacity)>.99);
        await page.goBack({waitUntil:'domcontentloaded'});
        assert.ok(page.url().endsWith(`/${locale}/products`));
        await page.reload({waitUntil:'domcontentloaded'});
        const footer=await footerPaint(page);
        return {clientNavigation:true,detailHeadingEntered:true,backAndRefresh:true,footer};
      });
      await check(`${name}/${locale}/errors`,async() => {assert.deepEqual(errors,[]);return {errors};});
      await page.close();
    }
  }finally{await browser.close();}
}
await save();
assert.deepEqual(failures,[]);
