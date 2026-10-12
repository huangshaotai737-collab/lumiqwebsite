import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({channel:'chrome',headless:true});
try {
 const p=await b.newPage({viewport:{width:1440,height:1000}});
 await p.goto('http://127.0.0.1:4211/en');await p.waitForTimeout(8000);
 const stage=p.locator('.lh-products-stage');
 const section=p.locator('.lh-products');
 for(const interval of [250,100]) {
  await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(500);
  await stage.evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top-160));
  await p.mouse.move(20,450);await p.mouse.wheel(0,200);await p.waitForTimeout(500);
  const origin=await p.evaluate(()=>scrollY);
  const initial=Number(await section.getAttribute('data-active-product'));
  // Place the mouse over a side card while the gate owns scrolling.
  const side=await p.locator('.glass-sample-content[data-offset="1"]').boundingBox();
  await p.mouse.move(side.x+side.width/2,side.y+side.height/2);
  await p.mouse.wheel(0,100);await p.waitForTimeout(interval);
  await p.mouse.wheel(0,100);
  await p.waitForTimeout(1150);
  assert.equal(Number(await section.getAttribute('data-active-product')),(initial+2)%5,'both rapid notches produce one change each');
  assert.equal(await p.evaluate(()=>scrollY),origin,'two changes never leave page');
  await p.mouse.wheel(0,160);await p.waitForTimeout(600);
  assert(await p.evaluate(()=>scrollY)>origin+130,'third notch exits without additional attempts');
 }
 await p.evaluate(()=>scrollTo(0,0));await p.waitForTimeout(500);
 await stage.evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top-160));
 await p.mouse.move(20,450);await p.mouse.wheel(0,200);await p.waitForTimeout(500);
 const held=await p.evaluate(()=>scrollY);
 const initial=Number(await section.getAttribute('data-active-product'));
 for(let i=0;i<3;i++){await p.mouse.wheel(0,100);await p.waitForTimeout(170);}
 assert.equal(await p.evaluate(()=>scrollY),held,'early third notch waits for both animations');
 await p.waitForTimeout(1500);
 assert.equal(Number(await section.getAttribute('data-active-product')),(initial+2)%5);
 assert(await p.evaluate(()=>scrollY)>held+70,'queued third notch exits after completion');
 console.log('PASS: 100/250ms notches, queued animation, hover conflict, exactly two changes, smooth third-scroll exit');
}finally{await b.close();}
