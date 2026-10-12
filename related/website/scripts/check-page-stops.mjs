import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4211/en');await page.waitForTimeout(8000);
 await page.locator('.lh-products-stage').evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top));
 const side=page.locator('.glass-sample-content[data-active="false"][data-offset="1"] a');
 await side.waitFor();await page.waitForTimeout(1100);
 const href=await side.getAttribute('href');
 await side.click();await page.waitForTimeout(850);
 assert(page.url().endsWith('/en'),'first click only selects');
 assert.equal(await page.locator('.glass-sample-content[data-active="true"] a').getAttribute('href'),href);
 await page.locator('.glass-sample-content[data-active="true"] a').click();
 await page.waitForURL(url=>url.pathname===href);
 await page.goto('http://127.0.0.1:4211/en');await page.waitForTimeout(8000);
 await page.locator('.lh-products-stage').evaluate(e=>scrollTo(0,scrollY+e.getBoundingClientRect().top));
 await page.evaluate(()=>scrollBy(0,-160));
 await page.mouse.move(15,450);await page.waitForTimeout(1000);
 await page.mouse.wheel(0,220);await page.waitForTimeout(500);
 assert(Math.abs((await page.locator('.lh-products-stage').boundingBox()).y)<2,'entry stops exactly at full page');
 assert.equal(await page.locator('.lh-products').getAttribute('data-active-product'),'0','entering gesture does not switch early');
 const before=await page.evaluate(()=>scrollY);
 await page.mouse.wheel(0,0);
 await page.evaluate(()=>scrollBy(0,12));
 await page.waitForTimeout(150);
 assert(Math.abs(await page.evaluate(()=>scrollY)-before)<2,'late scroll momentum cannot dislodge complete page');
 for(const index of ['1','2']) {
  await page.mouse.wheel(0,100);await page.waitForTimeout(900);
  assert.equal(await page.locator('.lh-products').getAttribute('data-active-product'),index);
  assert.equal(await page.evaluate(()=>scrollY),before);
 }
 await page.mouse.wheel(0,150);await page.waitForTimeout(300);
 assert(await page.evaluate(()=>scrollY)>before+100,'third wheel leaves product page');
 assert((await page.locator('.lh-products-stage').boundingBox()).y<0,'no pin');
 console.log('PASS: side click selects, active click navigates, two wheel switches before native exit');
} finally {await browser.close();}
