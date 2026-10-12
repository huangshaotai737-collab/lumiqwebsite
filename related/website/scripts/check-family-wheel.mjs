import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({channel:'chrome',headless:true});
try {
 const p=await b.newPage({viewport:{width:1440,height:900}});
 await p.goto('http://127.0.0.1:4211/en');await p.waitForSelector('.lh-home[data-home-state="open"]',{timeout:60000});
 const stage=p.locator('.lh-family-anchor'), cards=p.locator('.lh-family-chapters');
 for(const gap of [950,100]) {
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(500);
  await stage.evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top-180));
  await p.mouse.move(700,450);await p.mouse.wheel(0,150);await p.waitForTimeout(700);
  assert.equal(await stage.getAttribute('data-wheel-locked'),'true','complete page locks');
  const held=await p.evaluate(()=>scrollY), initial=Number(await cards.getAttribute('data-active-family'));
  await p.mouse.wheel(0,100);await p.waitForTimeout(gap);await p.mouse.wheel(0,100);
  await p.waitForTimeout(1650);
  assert.equal(Number(await cards.getAttribute('data-active-family')),(initial+2)%3,'two gestures show remaining two images');
  assert(Math.abs(await p.evaluate(()=>scrollY)-held)<2,'locked until third gesture');
  await p.mouse.wheel(0,150);await p.waitForTimeout(800);
  assert(await p.evaluate(()=>scrollY)>held+100,'third gesture releases');
  console.log(`PASS ${gap}ms family wheel sequence`);
 }
 // An exit queued while transitions run cannot cut either transition short.
 await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(500);
 await stage.evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top-180));
 await p.mouse.wheel(0,150);await p.waitForTimeout(700);
 const held=await p.evaluate(()=>scrollY), initial=Number(await cards.getAttribute('data-active-family'));
 for(let i=0;i<3;i++){await p.mouse.wheel(0,100);await p.waitForTimeout(170);}
 assert(Math.abs(await p.evaluate(()=>scrollY)-held)<2,'early exit waits');
 await p.waitForTimeout(1800);
 assert.equal(Number(await cards.getAttribute('data-active-family')),(initial+2)%3);
 assert(await p.evaluate(()=>scrollY)>held+70);
 await stage.evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top-86));await p.waitForTimeout(700);
 await p.screenshot({path:'/tmp/family-carousel.png'});
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(800);
 assert.equal(await stage.getAttribute('data-wheel-locked'),null,'mobile has no wheel lock');
 assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile fits');
 await p.locator('#family-tab-afternoon').click();await p.waitForTimeout(900);
 assert.equal(await cards.getAttribute('data-active-family'),'1','mobile tab switches image');
 assert.equal(await stage.getAttribute('data-wheel-locked'),null,'mobile carousel does not lock document');
 console.log('PASS queued release, reentry, mobile, no overflow');
}finally{await b.close();}
