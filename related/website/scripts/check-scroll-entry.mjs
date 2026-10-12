import {chromium,firefox,webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base=process.env.SITE_URL||'http://localhost:4225';
const out=process.env.QA_OUTPUT||'/private/tmp/lumiq-scroll-entry';
await fs.mkdir(out,{recursive:true});
const checks=[],failures=[];
const engines=process.env.ENGINE?[process.env.ENGINE]:['chromium','firefox','webkit'];
for(const engine of engines){
  const browser=await ({chromium,firefox,webkit}[engine]).launch();
  try{
    for(const locale of ['en','zh-hant','ja']) for(const viewport of [{width:390,height:844},{width:1440,height:1000}]){
      const page=await browser.newPage({viewport});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>{
        window.__entries=[];
        const animate=Element.prototype.animate;
        Element.prototype.animate=function(frames,options){
          window.__entries.push({element:this,text:this.textContent,frames,options});
          return animate.call(this,frames,options);
        };
      });
      try{
        await page.goto(`${base}/${locale}`,{waitUntil:'load'});
        const title=page.locator('#films-title');
        await title.waitFor({state:'attached'});
        await page.waitForFunction(()=>document.querySelector('#films-title')?.dataset.scrollReveal==='pending');
        const before=await title.evaluate(element=>({text:element.textContent,spacing:getComputedStyle(element).letterSpacing,width:element.offsetWidth,height:element.offsetHeight}));
        await title.evaluate(element=>window.scrollTo({top:scrollY+element.getBoundingClientRect().top-innerHeight*.7,behavior:'instant'}));
        await page.waitForFunction(()=>window.__entries.some(entry=>entry.element.id==='films-title'&&entry.options.duration>=500));
        const motion=await page.evaluate(()=>window.__entries.find(entry=>entry.element.id==='films-title').frames);
        assert.ok(motion.some(frame=>frame.transform==='translateY(24px)'));
        await page.waitForFunction(()=>!document.querySelector('#films-title').getAnimations().length);
        assert.deepEqual(await title.evaluate(element=>({text:element.textContent,spacing:getComputedStyle(element).letterSpacing,width:element.offsetWidth,height:element.offsetHeight})),before);
        assert.equal(await title.locator('.scroll-word').count(),0);
        if(viewport.width>1100&&engine!=='webkit'){
          await page.locator('.lh-films-stage').evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
          await page.waitForFunction(()=>document.querySelector('.lh-film-character video')?.currentTime>.5);
          const alpha=await page.locator('.lh-film-character video').evaluate(video=>{
            const canvas=document.createElement('canvas');canvas.width=192;canvas.height=108;
            const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,192,108);return ctx.getImageData(0,0,1,1).data[3];
          });
          assert.equal(alpha,0);
        }
        await page.goto(`${base}/${locale}/products`,{waitUntil:'load'});
        await page.locator(`a[href$="/products/tablet"]:visible`).last().click();
        await page.waitForURL(`**/${locale}/products/tablet`);
        const detail=page.locator('.pd-story-copy h2');
        await detail.waitFor({state:'attached'});
        await page.waitForFunction(()=>document.querySelector('.pd-story-copy h2')?.dataset.scrollReveal==='pending');
        await detail.evaluate(element=>element.scrollIntoView({block:'center',behavior:'instant'}));
        await page.waitForFunction(()=>window.__entries.some(entry=>entry.element.matches('.pd-story-copy h2')&&entry.options.duration>=500));
        await page.emulateMedia({media:'print'});
        assert.equal(await page.locator('[data-scroll-reveal="pending"]').evaluateAll(elements=>elements.filter(element=>getComputedStyle(element).opacity==='0').length),0,'Printing must include unvisited copy');
        await page.emulateMedia({media:'screen'});
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.waitForFunction(()=>!document.querySelector('[data-scroll-reveal="pending"]'));
        await page.reload({waitUntil:'load'});
        assert.equal(await page.locator('[data-scroll-reveal="pending"]').count(),0);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
        assert.deepEqual(errors,[]);
        checks.push({engine,locale,viewport,entry:true,fontStable:true,clientNavigation:true,printVisible:true,reducedMotion:true});
        console.log(`PASS ${engine} ${locale} ${viewport.width}: entry, font stability, client navigation, reduced motion`);
      }catch(error){failures.push({engine,locale,viewport,error:error.message});console.log(`FAIL ${engine} ${locale} ${viewport.width}: ${error.message}`);}
      await page.close();
    }
  }finally{await browser.close();}
}
await fs.writeFile(`${out}/entry-report${process.env.ENGINE?`-${process.env.ENGINE}`:''}.json`,JSON.stringify({checks,failures},null,2));
assert.deepEqual(failures,[]);
