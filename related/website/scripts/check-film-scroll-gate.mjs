import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4211/en');
 await page.waitForTimeout(8000);
 const enter=async()=>{
  await page.locator('.lh-films').evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top-186));
  await page.waitForTimeout(500);
  await page.mouse.wheel(0,100);
  await page.waitForTimeout(500);
 };
 await enter();
 await page.mouse.move(40,450); // The rule applies even outside the video itself.
 const before=await page.evaluate(()=>scrollY);
 await page.mouse.wheel(0,0);
 await page.evaluate(()=>scrollBy(0,12));
 await page.waitForTimeout(150);
 assert(Math.abs(await page.evaluate(()=>scrollY)-before)<2,'late scroll momentum cannot dislodge complete page');
 for(const label of ['2 / 3','3 / 3']) {
  await page.mouse.wheel(0,100);
  await page.waitForTimeout(100);
  await page.mouse.wheel(0,30); // Same gesture momentum must not count twice.
  await page.waitForTimeout(900);
  assert.equal(await page.locator('.lh-film-card').getAttribute('aria-label'),label);
  assert.equal(await page.evaluate(()=>scrollY),before);
 }
 await page.locator('.lh-film-card').hover();
 await page.mouse.wheel(0,100);
 await page.waitForTimeout(100);
 await page.mouse.wheel(0,40);
 await page.waitForTimeout(300);
 assert(await page.evaluate(()=>scrollY)>=before+135,'third gesture including momentum scrolls naturally');
 assert((await page.locator('.lh-films').boundingBox()).y<0,'carousel is not pinned');
 await page.evaluate(()=>scrollTo(0,0));
 await page.waitForTimeout(500);
 await enter();
 const reentry=await page.evaluate(()=>scrollY);
 await page.mouse.move(40,450);
 await page.mouse.wheel(0,100);
 await page.waitForTimeout(900);
 assert.equal(await page.evaluate(()=>scrollY),reentry,'new visit resets the two-switch requirement');
 assert.equal(await page.locator('.lh-film-card').getAttribute('aria-label'),'1 / 3');
 await page.mouse.wheel(0,-150);
 await page.waitForTimeout(300);
 assert(await page.evaluate(()=>scrollY)<reentry-100,'upward scrolling remains free');
 console.log('PASS: two switches, momentum filtering, native exit, re-entry reset, free upward scroll');
} finally {await browser.close();}
