import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

// A horizontal media offset must not expose a strip of the fallback background.
const browser = await chromium.launch({channel:'chrome', headless:true});
try {
  for (const [width,height] of process.argv[2]?[]:[[1440,1000],[1920,1080],[2560,1080]]) {
    const page=await browser.newPage({viewport:{width,height}});
    await page.goto('http://localhost:4211/en',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.lh-home')?.dataset.homeState==='open');
    await page.waitForFunction(()=>document.querySelector('.lh-opening')?.dataset.videoMode==='true');
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(500);
    const result=await page.evaluate(()=>{
      const video=document.querySelector('.lh-opening-video').getBoundingClientRect();
      const layer=document.querySelector('.lh-video-layer').getBoundingClientRect();
      const nav=document.querySelector('.navbar.site-nav').getBoundingClientRect();
      return {left:video.left,right:video.right,top:video.top,bottom:video.bottom,center:(video.left+video.right)/2,layerTop:layer.top,navBottom:nav.bottom,font:parseFloat(getComputedStyle(document.querySelector('.lh-hero h1')).fontSize),body:parseFloat(getComputedStyle(document.querySelector('.lh-hero .lh-lead')).fontSize),baseBody:parseFloat(getComputedStyle(document.querySelector('.lh-home')).getPropertyValue('--lq-body'))};
    });
    assert.ok(result.left<=1,`${width}: uncovered left edge ${result.left}px`);
    assert.ok(result.right>=width-1,`${width}: uncovered right edge`);
    assert.ok(result.left<0 && result.right>width,`${width}: video does not have the requested slight overscan`);
    assert.ok(Math.abs(result.center-width/2)<=1,`${width}: video is not centered`);
    assert.ok(result.layerTop<=0&&result.top<=0&&result.bottom>=height,`${width}: background does not fill screen vertically`);
    assert.ok(result.font<=91.612,`${width}: hero heading has not been reduced`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${width}: horizontal page overflow`);
    console.log('PASS',width,height,result);
    await page.close();
  }
  for (const [width,height] of [[1280,720],[1440,1000],[1920,1080]]) {
    const page=await browser.newPage({viewport:{width,height}});
    await page.goto('http://localhost:4211/en#ola',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>document.querySelector('.lh-opening')?.dataset.videoMode==='true');
    await page.waitForTimeout(2600);
    const result=await page.evaluate(()=>{
      const title=document.querySelector('#ola-title');
      const gray=title.querySelector('.lh-muted');
      const range=document.createRange(); range.selectNodeContents(gray);
      const tops=[...range.getClientRects()].filter(r=>r.width>1&&r.height>1).map(r=>Math.round(r.top/4));
      const nav=document.querySelector('.navbar.site-nav').getBoundingClientRect();
      const cards=document.querySelector('.lh-rhythm-cards').getBoundingClientRect();
      return {lines:new Set(tops).size,gap:title.getBoundingClientRect().top-nav.bottom,right:gray.getBoundingClientRect().right,cardsBottom:cards.bottom,cardsTop:cards.top};
    });
    assert.equal(result.lines,1,`${width}: gray heading wraps to more than one line`);
    assert.ok(result.gap>=72,`${width}: title too close to navigation (${result.gap}px)`);
    assert.ok(result.right<=width-24,`${width}: gray heading overflows`);
    assert.ok(result.cardsBottom<=height-24,`${width}: cards extend below screen (${result.cardsBottom}px)`);
    assert.ok(result.cardsTop>=result.gap+80,`${width}: cards overlap title`);
    console.log('PASS rhythm',width,height,result);
    await page.close();
  }
} finally {await browser.close();}
