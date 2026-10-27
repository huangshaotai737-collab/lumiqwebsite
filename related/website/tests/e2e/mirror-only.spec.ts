import {test,expect} from '@playwright/test';
for(const viewport of [{width:1440,height:900},{width:2560,height:640}])test(`mirror is the only desktop surface at ${viewport.width}`,async({page},info)=>{
 await page.setViewportSize(viewport);
 let release!:()=>void;const gate=new Promise<void>(r=>release=r);
 await page.route(/\/_next\/static\/chunks\/.*\.js(?:\?.*)?$/,async route=>{await gate;await route.continue();});
 await page.goto('/zh-hant#products',{waitUntil:'commit'});
 await expect(page.locator('.lh-products-viewport')).toHaveCSS('visibility','hidden');
 release();
 await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
 await page.locator('.lh-products-stage').scrollIntoViewIfNeeded();
 await expect(page.locator('#products')).toHaveAttribute('data-glass-3d','',{timeout:30000});
 await expect(page.locator('.lh-glass-products canvas')).toBeVisible();
 await expect(page.locator('.lh-products-viewport')).toBeHidden();
 await expect(page.locator('[data-projected="true"]')).toHaveCount(5);
 await page.locator('[data-products-next]').click();
 await expect(page.locator('#products')).toHaveAttribute('data-active-product','1');
 await page.waitForTimeout(1000);
 await page.screenshot({path:info.outputPath('mirror.png')});
 await page.reload({waitUntil:'domcontentloaded'});
 await expect(page.locator('#products')).toHaveAttribute('data-glass-3d','',{timeout:30000});
 await expect(page.locator('.lh-products-viewport')).toBeHidden();
});
test('phones retain usable carousel and navigation',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/zh-hant#products');
 await expect(page.locator('.lh-products-viewport')).toBeVisible();
 await page.locator('[data-products-next]').click();await expect(page.locator('#products')).toHaveAttribute('data-active-product','1');
 await expect(page.locator('.lh-glass-products canvas')).toHaveCount(0);
});
test('unsupported WebGL leaves accessible product links',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))return null;return Reflect.apply(original,this,[type,...args]);} as typeof original;});
 await page.goto('/zh-hant#products');await page.locator('.lh-products-stage').scrollIntoViewIfNeeded();
 await expect(page.locator('#products')).toHaveAttribute('data-glass-fallback','');await expect(page.locator('.lh-products-viewport')).toBeVisible();
});

test('mirror remains usable when product artwork fails', async ({page}) => {
  await page.route('**/assets/home-products-refined-20260907/**', route => route.abort());
  await page.goto('/zh-hant#products');
  await page.locator('.lh-products-stage').scrollIntoViewIfNeeded();
  await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout:30000});
  await expect(page.locator('[data-projected="true"]')).toHaveCount(5);
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product', '1');
});

test('slow artwork does not gate the complete mirror scene', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/home-products-refined-20260907/**', async route => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/zh-hant#products', {waitUntil:'domcontentloaded'});
    await page.locator('.lh-products-stage').scrollIntoViewIfNeeded();
    await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout:30000});
    await expect(page.locator('[data-projected="true"]')).toHaveCount(5);
    await page.locator('[data-products-next]').click();
    await expect(page.locator('#products')).toHaveAttribute('data-active-product', '1');
  } finally { release(); }
});

test('mirror stops GPU draws while idle and wakes for carousel input', async ({page}) => {
  await page.addInitScript(() => {
    const state = window as typeof window & {mirrorDraws:number};
    state.mirrorDraws = 0;
    const draw = WebGL2RenderingContext.prototype.drawElements;
    WebGL2RenderingContext.prototype.drawElements = function(...args: Parameters<typeof draw>) {
      state.mirrorDraws++;
      return draw.apply(this, args);
    };
  });
  await page.goto('/zh-hant#products');
  await expect(page.locator('#products')).toHaveAttribute('data-glass-3d', '', {timeout:30000});
  await page.waitForTimeout(3000);
  const readDraws = () => page.evaluate(() => (window as typeof window & {mirrorDraws:number}).mirrorDraws);
  const before = await readDraws();
  await page.waitForTimeout(1000);
  expect(await readDraws()).toBe(before);
  await page.locator('[data-products-next]').click();
  await expect(page.locator('#products')).toHaveAttribute('data-active-product','1');
  await expect.poll(readDraws).toBeGreaterThan(before);
  await page.waitForTimeout(2500);
  const settled = await readDraws();
  await page.waitForTimeout(1000);
  expect(await readDraws()).toBe(settled);
});
