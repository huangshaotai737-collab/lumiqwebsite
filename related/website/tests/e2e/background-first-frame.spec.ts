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
 await expect(page.locator('.lh-glass-products')).toHaveAttribute('data-renderer','static-mirror');
});

test('light background keeps the existing forward, frozen and reverse video scrub', async ({page}) => {
 await page.goto('/zh-hant#products');
 const video = page.locator('[data-background-video]');
 await expect.poll(() => video.getAttribute('src')).toContain('/site-backgrounds-20261108/pearl-flow-scroll.mp4');
 await expect(video).toHaveAttribute('data-ready', 'true', {timeout: 20000});
 const cues = await video.evaluate((v: HTMLVideoElement) => JSON.parse(v.dataset.scrollCues!) as [number, number][]);
 for (const seconds of [10, 20, 5]) {
  const position = cues.find(([, time]) => time === seconds)![0];
  await page.evaluate(y => scrollTo({top: y, behavior: 'instant'}), position);
  await expect.poll(() => video.evaluate((v: HTMLVideoElement, target) => Math.abs(v.currentTime - target), seconds)).toBeLessThan(.15);
  await expect(video).toHaveCSS('opacity', '1');
  expect(await video.evaluate((v: HTMLVideoElement) => v.paused)).toBe(true);
 }
 const stopped = await video.evaluate((v: HTMLVideoElement) => v.currentTime);
 await page.waitForTimeout(500);
 expect(await video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBe(stopped);
});

test('background failure keeps a visible poster and usable navigation', async ({page}) => {
 await page.route('**/pearl-flow-scroll.mp4', route => route.abort());
 await page.goto('/zh-hant#products');
 await expect(page.locator('[data-background-fallback]')).toHaveCSS('opacity', '1');
 await expect(page.locator('[data-background-video]')).toHaveCSS('opacity', '0');
 expect(await page.locator('[data-background-fallback]').evaluate(e => getComputedStyle(e).backgroundImage)).toContain('pearl-flow-poster.webp');
 await page.locator('.site-nav a[href="/zh-hant/products"]').first().click();
 await expect(page).toHaveURL(/\/zh-hant\/products$/);
});

test('mobile keeps native scrolling, light backgrounds and working menu', async ({page}) => {
 await page.setViewportSize({width: 390, height: 844});
 const movies: string[] = [];
 page.on('request', request => { if(request.url().includes('pearl-flow-scroll.mp4')) movies.push(request.url()); });
 await page.goto('/zh-hant');
 await page.locator('#safety').scrollIntoViewIfNeeded();
 expect(await page.locator('#safety').evaluate(e => getComputedStyle(e, '::before').backgroundImage)).toContain('site-backgrounds-20261108');
 expect(movies).toEqual([]);
 await expect(page.locator('[data-background-video]')).not.toHaveAttribute('src');
 await page.locator('.site-mobile-trigger').click();
 await expect(page.locator('#mobile-navigation')).toBeVisible();
 await page.locator('.site-mobile-trigger').click();
 await expect(page.locator('#mobile-navigation')).toBeHidden();
 expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});
