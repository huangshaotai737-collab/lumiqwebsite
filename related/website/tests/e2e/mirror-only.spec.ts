import {test,expect} from '@playwright/test';
for (const viewport of [{width:1440,height:900},{width:2560,height:640}]) {
 test(`fixed mirror paints before JavaScript at ${viewport.width}`, async ({browser,baseURL}) => {
  const context=await browser.newContext({javaScriptEnabled:false,viewport});
  const page=await context.newPage();
  try {
   await page.goto(`${baseURL}/zh-hant#products`);
   await expect(page.locator('.lh-product-slot > a')).toHaveCount(5);
   for (const card of await page.locator('.lh-product-slot > a').all()) await expect(card).toBeVisible();
   await expect(page.locator('.lh-products-viewport')).toHaveCSS('visibility','visible');
   await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
  } finally { await context.close(); }
 });
 test(`fixed mirror retains carousel at ${viewport.width}`,async({page},info)=>{
  await page.setViewportSize(viewport);
  await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))throw Error('Homepage must not initialize WebGL');return Reflect.apply(get,this,[type,...args]);} as typeof get;});
  await page.goto('/zh-hant#products');
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
  await page.locator('.lh-products-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('.lh-product-reflection')).toHaveCount(5);
  await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product','1');
  await page.waitForTimeout(700);
  const boxes=await page.locator('.lh-product-slot > a').evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width};}));
  expect(boxes.every(r=>r.width>0 && r.left>=0 && r.right<=viewport.width)).toBeTruthy();
  await page.screenshot({path:info.outputPath('static-mirror.png')});
  await page.locator('.lh-product-slot[data-active=true] > a').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#products')).toHaveAttribute('data-active-product','2');
  await page.locator('.lh-product-slot[data-active=true] > a').click();
  await expect(page).toHaveURL(/\/products\//);
 });
}
test('phone keeps native product controls and no decorative mirror',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/zh-hant#products');
 await page.locator('[data-products-next]').click();await expect(page.locator('#products')).toHaveAttribute('data-active-product','1');
 await expect(page.locator('.lh-product-reflection').first()).toBeHidden();
 await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
});
