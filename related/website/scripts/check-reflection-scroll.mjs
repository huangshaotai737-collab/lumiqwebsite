import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4211/en');
 await page.waitForTimeout(8000);
 const start=await page.locator('.lh-products-stage').evaluate(el=>scrollY+el.getBoundingClientRect().top);
 const sample=async y=>{
  await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);
  await page.waitForTimeout(400);
  return page.locator('.lh-glass-products canvas').evaluate(c=>({fade:Number(c.dataset.reflectionOpacity),offset:Number(c.dataset.reflectionOffset)}));
 };
 assert.equal((await sample(start-200)).fade,0,'no reflection before landing');
 assert.equal((await sample(start+60)).fade,1,'reflection visible at ground contact');
 await page.screenshot({path:'/tmp/lumiq-reflection-contact.png'});
 const leaving=await sample(start+320);
 assert(leaving.fade>0 && leaving.fade<1,'reflection fades during exit');
 assert(leaving.offset>0,'reflection moves downward opposite exiting cards');
 assert.equal((await sample(start+650)).fade,0,'no reflection near top');
 await page.screenshot({path:'/tmp/lumiq-reflection-exit.png'});
 assert.equal((await sample(start+60)).fade,1,'returning restores contact reflection');
 console.log('PASS reflection contact, reverse-direction exit, fade and return');
} finally { await browser.close(); }
