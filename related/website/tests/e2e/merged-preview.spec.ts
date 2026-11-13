import {test,expect} from '@playwright/test';
test('homepage remains usable while video requests are pending',async({page})=>{
 await page.route(/\.(mp4|webm|mov)(\?|$)/,async r=>{await new Promise(resolve=>setTimeout(resolve,15000));await r.abort().catch(()=>{});});
 await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.lh-loader')).toHaveCount(0);
 await expect(page.locator('.site-nav')).toBeVisible();
 await page.locator('.site-desktop-nav a[href="/zh-hant/products"]').click();
 await expect(page).toHaveURL(/\/zh-hant\/products$/);
});
for(const viewport of [{width:390,height:844},{width:2560,height:640}])test(`merged appearance ${viewport.width}`,async({page},info)=>{
 await page.setViewportSize(viewport);
 await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
 await expect(page.locator('.lh-loader')).toHaveCount(0);
 await expect(page.locator('.lh-home')).toHaveAttribute('data-home-state','open');
 await page.screenshot({path:info.outputPath('homepage.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.goto('/zh-hant/products/tablet',{waitUntil:'domcontentloaded'});
 for(const name of ['tablet-passive-new-scene-20261026','tablet-family-new-scene-20261026']){
  const image=page.locator(`img[src*="${name}"]`).first();await image.scrollIntoViewIfNeeded();
  await expect.poll(()=>image.evaluate((e:HTMLImageElement)=>e.naturalWidth)).toBeGreaterThan(0);
 }
 await page.screenshot({path:info.outputPath('tablet.png')});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.goto('/zh-hant/products/nest',{waitUntil:'domcontentloaded'});
 await page.locator('.orb-overview').scrollIntoViewIfNeeded();
 await expect(page.locator('.orb-overview-step')).toHaveCount(4);
 await page.screenshot({path:info.outputPath('orb.png')});
});
