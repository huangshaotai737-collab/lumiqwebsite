import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4211/en');await page.waitForTimeout(8000);
 for(const width of [1440,1920]) {
  await page.setViewportSize({width,height:1000});await page.waitForTimeout(600);
  for(const selector of ['.lh-products-stage','.lh-films-stage']) {
   for(const mode of ['two-fast','burst','reverse-reenter']) {
    await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(400);
    const top=selector.includes('products')?0:86;
    await page.locator(selector).evaluate((e,top)=>scrollTo(0,scrollY+e.getBoundingClientRect().top-top-160),top);
    await page.mouse.move(20,500);await page.waitForTimeout(400);
    await page.evaluate(()=>{window.__entry=[];let end=performance.now()+600;function tick(){window.__entry.push(scrollY);if(performance.now()<end)requestAnimationFrame(tick)}requestAnimationFrame(tick)});
    await page.mouse.wheel(0,2500);await page.waitForTimeout(650);
    const held=await page.evaluate(()=>scrollY);
    assert(Math.abs((await page.locator(selector).boundingBox()).y-top)<2,`${mode}: exact landing`);
    const entry=await page.evaluate(()=>window.__entry);
    assert(new Set(entry.map(Math.round)).size>3,'landing decelerates across frames, not one abrupt jump');
    if(mode==='reverse-reenter') {
      await page.mouse.wheel(0,-80);await page.waitForTimeout(350);
      await page.mouse.wheel(0,100);await page.waitForTimeout(500);
      assert(Math.abs(await page.evaluate(()=>scrollY)-held)<2,'reverse then reenter lands correctly');
    }
    await page.evaluate(selector=>{
      const read=()=>selector.includes('products')?document.querySelector('.lh-products').dataset.activeProduct:document.querySelector('.lh-film-card').getAttribute('aria-label');
      const data=window.__stress={frames:[],changes:0,last:read(),end:performance.now()+5000};
      let prev=performance.now();function tick(t){let current=read();if(current!==data.last){data.changes++;data.last=current}data.frames.push({y:scrollY,n:data.changes,dt:t-prev});prev=t;if(t<data.end)requestAnimationFrame(tick)}requestAnimationFrame(tick);
    },selector);
    if(mode==='burst') {
      for(let i=0;i<35;i++){await page.mouse.wheel(0,100);await page.waitForTimeout(12)}
      await page.waitForTimeout(1800);
      // If throttling coalesced the burst, provide distinct remaining gestures.
      for(let i=0;i<3 && await page.evaluate(()=>scrollY)<=held+2;i++){await page.waitForTimeout(200);await page.mouse.wheel(0,100);await page.waitForTimeout(900)}
    } else {
      await page.mouse.wheel(0,100);await page.waitForTimeout(110);await page.mouse.wheel(0,100);
      await page.waitForTimeout(1750);
      assert(Math.abs(await page.evaluate(()=>scrollY)-held)<2,'exactly two gestures remain fixed');
      assert.equal(await page.evaluate(()=>window.__stress.changes),2,'exactly two card changes');
      await page.mouse.wheel(0,160);await page.waitForTimeout(650);
    }
    const data=await page.evaluate(()=>{window.__stress.end=0;return window.__stress});
    assert(!data.frames.some(f=>f.y>held+2&&f.n<2),'never cross limit before two completed card selections');
    assert(await page.evaluate(()=>scrollY)>held+60,'third gesture releases without deadlock');
    const gaps=data.frames.map(f=>f.dt).sort((a,b)=>a-b);
    results.push({width,selector,mode,changes:data.changes,p95:Math.round(gaps[Math.floor(gaps.length*.95)]),over100ms:gaps.filter(x=>x>100).length});
    console.log('PASS',results.at(-1));
   }
  }
 }
 assert.deepEqual(errors,[],'no browser runtime errors');
 console.log(JSON.stringify(results));
}finally{await browser.close()}
