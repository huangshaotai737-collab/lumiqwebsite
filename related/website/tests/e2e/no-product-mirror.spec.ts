import {test,expect} from '@playwright/test';
for(const viewport of [{width:1440,height:900},{width:2560,height:640},{width:390,height:844}])test(`HTML product carousel has no reflection handoff at ${viewport.width}`,async({page},info)=>{
 await page.setViewportSize(viewport);
 await page.goto('/zh-hant#products',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
 await page.locator('.lh-products-stage').scrollIntoViewIfNeeded();
 const cards=page.locator('.lh-product-slot');
 await expect(cards).toHaveCount(5);
 await expect(page.locator('.lh-glass-products')).toHaveAttribute('data-renderer','html');
 const before=await cards.first().boundingBox();
 await page.waitForTimeout(4000);
 await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
 await expect(page.locator('#products')).not.toHaveAttribute('data-glass-3d');
 const after=await cards.first().boundingBox();
 expect(Math.abs(before!.width-after!.width)).toBeLessThan(1);
 await expect(page.locator('.lh-product').first()).toHaveCSS('-webkit-box-reflect','none');
 for(let i=1;i<=5;i++){
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product',String(i%5));
 }
 await page.locator('[data-products-previous]').click();
 await expect(page.locator('#products')).toHaveAttribute('data-active-product','4');
 await expect(cards.locator('a').first()).toHaveAttribute('href',/\/products\//);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
 await page.waitForTimeout(900);
 if(viewport.width>=1200){
  const boxes=await cards.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right};}).sort((a,b)=>a.x-b.x));
  for(let i=1;i<boxes.length;i++)expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i-1].right-1);
 }
 await page.screenshot({path:info.outputPath('no-mirror.png')});
});
