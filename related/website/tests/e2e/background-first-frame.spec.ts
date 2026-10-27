import {test,expect} from '@playwright/test';
test('background still stays visible until decoded video frame is presented',async({page})=>{
 await page.addInitScript(()=>{
  const state=window as typeof window & {releaseVideo?:()=>void};
  const pending:Array<()=>void>=[];let released=false;
  const original=HTMLVideoElement.prototype.requestVideoFrameCallback;
  HTMLVideoElement.prototype.requestVideoFrameCallback=function(callback:VideoFrameRequestCallback){return original.call(this,(now,meta)=>{if(released)callback(now,meta);else pending.push(()=>callback(now,meta));});};
  state.releaseVideo=()=>{released=true;pending.splice(0).forEach(fn=>fn());};
 });
 await page.goto('/zh-hant#products');
 await page.locator('.lh-products-stage').scrollIntoViewIfNeeded();
 await expect.poll(()=>page.locator('[data-background-video]').evaluate((v:HTMLVideoElement)=>v.readyState)).toBeGreaterThanOrEqual(2);
 await expect(page.locator('[data-background-video]')).toHaveCSS('opacity','0');
 await expect(page.locator('[data-background-fallback]')).toHaveCSS('opacity','1');
 await page.evaluate(()=>(window as typeof window & {releaseVideo:()=>void}).releaseVideo());
 await page.mouse.wheel(0,50);
 await expect(page.locator('[data-background-video]')).toHaveCSS('opacity','1',{timeout:15000});
 await expect(page.locator('#products')).toHaveAttribute('data-glass-3d','');
});
