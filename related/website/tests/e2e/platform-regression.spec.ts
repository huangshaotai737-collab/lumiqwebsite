import {test,expect,type Page} from '@playwright/test';
const products=['ola','ola-go','tablet','print','nest'];
async function noHorizontalOverflow(page:Page) {
  const {scrollWidth,viewportWidth}=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth}));
  expect(scrollWidth).toBeLessThanOrEqual(viewportWidth+1);
}
async function fiveProducts(page:Page) {
  for(const id of products) await expect(page.locator(`#products .lh-product-slot-${id}`)).toHaveCount(1);
}
for(const locale of ['en','zh-hant','ja']) test(`${locale}: no_horizontal_overflow and five_product_entries_survive_resize`,async({page},info)=>{
  test.skip(info.project.name!=='desktop');test.setTimeout(150000);
  await page.goto(`/${locale}`);await expect(page.locator('#hero-title')).toBeVisible();
  let resizePass=0;
  for(const width of [1920,320,360,390,430,820,1440,1920]) {
    resizePass++;await page.setViewportSize({width,height:900});await fiveProducts(page);await noHorizontalOverflow(page);
    if(width>=1440) {
      await page.locator('#products').scrollIntoViewIfNeeded();
      // Settled desktop presentation must expose every product, including Orb.
      if(await page.locator('#products').getAttribute('data-glass-3d')!==null) await expect(page.locator('#products canvas')).toBeVisible();
      else for(const id of products) await expect(page.locator(`#products .lh-product-slot-${id}`)).toBeVisible();
      await page.screenshot({path:`test-results/home-products-${locale}-${width}-${resizePass}.png`,animations:'disabled'});
    }
  }
  for(const route of ['login','register','reset-password','faq','prelaunch','checkout','members/orders']) {
    for(const width of [320,430,820,1440]) {
      await page.setViewportSize({width,height:900});await page.goto(`/${locale}/${route}`);await noHorizontalOverflow(page);
    }
  }
});
test('first-load media failure retains readable published content',async({page},info)=>{
 test.skip(info.project.name!=='desktop');
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,type:string,...args:unknown[]){return /webgl/i.test(type)?null:original.call(this,type,...args);} as typeof original;});
 await page.route('**/*.mp4',route=>route.abort());await page.goto('/en');
 await expect(page.locator('#hero-title')).toBeVisible();await fiveProducts(page);await noHorizontalOverflow(page);
 await page.locator('#products[data-enhanced="true"]').waitFor();await page.locator('#products').scrollIntoViewIfNeeded();
 for(const id of products) {
  const card=page.locator(`#products .lh-product-slot-${id}`);
  await expect.poll(()=>card.evaluate(el=>Number(getComputedStyle(el).opacity))).toBeGreaterThan(.5);
  const box=await card.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(page.viewportSize()!.width+1);
 }
});
// A deliberate missing business entry must make the exact production assertion fail.
// Enabled only by the fault-injection runner, never by a live application request.
test('five-card fault counterexample',async({page},info)=>{
 test.skip(info.project.name!=='desktop' || process.env.LUMIQ_REGRESSION_FAULT!=='missing-product');
 await page.goto('/en');await fiveProducts(page);
 await page.locator('#products .lh-product-slot-nest').evaluate(element=>element.remove());
 console.log('INJECTED missing-product');
 await fiveProducts(page);
});
