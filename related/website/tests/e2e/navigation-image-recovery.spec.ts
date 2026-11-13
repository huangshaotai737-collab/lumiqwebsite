import {expect, test} from '@playwright/test';

test('Home and logo return a scrolled homepage to its opening without a reload', async ({page}) => {
  await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
  await page.evaluate(() => document.fonts.ready);
  for(const selector of ['.site-desktop-nav a[href="/zh-hant"]','.nav-logo']) {
    await page.locator('#films').evaluate(e => scrollTo({top:scrollY+e.getBoundingClientRect().top-100,behavior:'instant'}));
    await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(500);
    await page.locator(selector).click();
    await expect.poll(()=>page.evaluate(()=>scrollY),{timeout:2500}).toBeLessThan(2);
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity','1');
  }
});

test('a temporary home image failure recovers to sharp artwork without a custom event',async({page})=>{
  let fail=true;
  await page.route(url=>/learn(?:-|\.webp)/.test(decodeURIComponent(url.href)),async route=>{
    if(fail){await route.fulfill({status:503,contentType:'text/plain',body:'temporary failure'});}
    else await route.continue();
  });
  await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
  const image=page.locator('.lh-rhythm-learn img');
  await expect(image).toHaveAttribute('data-home-image-state','error');
  fail=false;
  await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>100),{timeout:10000}).toBe(true);
  await expect(image).not.toHaveAttribute('src',/^data:/);
});

test('a failed product image optimizer falls back to a real image',async({page})=>{
  await page.route(url=>(url.pathname==='/_next/image' && (url.searchParams.get('url')||'').includes('ola-hero-front')) || url.pathname.startsWith('/assets/responsive/ola-hero-front-'),route=>route.fulfill({status:503,contentType:'text/plain',body:'optimizer unavailable'}));
  await page.goto('/zh-hant/products/ola',{waitUntil:'domcontentloaded'});
  const hero=page.locator('img[alt]').filter({visible:true});
  await expect.poll(()=>hero.evaluateAll(imgs=>imgs.some(el=>{const img=el as HTMLImageElement;return img.currentSrc.includes('ola-hero-front')&&img.complete&&img.naturalWidth>500;})),{timeout:10000}).toBe(true);
});

test('navigation intent warms its destination even while home artwork is still pending',async({page})=>{
  let release!:()=>void;
  const held=new Promise<void>(r=>release=r);
  let requested=false;
  await page.route(url=>/learn(?:-|\.webp)/.test(decodeURIComponent(url.href)),async route=>{await held;await route.continue().catch(()=>{});});
  page.on('request',request=>{const url=new URL(request.url());if(url.pathname==='/zh-hant/products'&&url.searchParams.has('_rsc'))requested=true;});
  try{
    await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
    await page.locator('.site-desktop-nav a[href="/zh-hant/products"]').hover();
    await expect.poll(()=>requested,{timeout:2000}).toBe(true);
  }finally{release();}
});

test('homepage does not speculatively download other pages product heroes',async({page})=>{
  const unrelated:string[]=[];
  page.on('request',request=>{if(request.resourceType()==='image' && /tablet-hero-original-transparent|ola-hero-front/.test(decodeURIComponent(request.url()))) unrelated.push(request.url());});
  await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
  await page.waitForTimeout(6500);
  expect(unrelated).toEqual([]);
});

test('phone Home closes the menu and returns to the opening',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/ja',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.lh-mobile-films-track')).toBeAttached();
  await page.locator('#films').evaluate(e=>e.scrollIntoView({behavior:'instant'}));
  await page.locator('.site-mobile-trigger').click();
  await page.locator('#mobile-navigation a[href="/ja"]').click();
  await expect(page.locator('#mobile-navigation')).toBeHidden();
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(2);
  await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
});

test('image retries stop during an outage and resume when the network returns',async({page})=>{
  let fail=true;
  let attempts=0;
  await page.route(url=>/learn(?:-|\.webp)/.test(decodeURIComponent(url.href)),async route=>{
    attempts++;
    if(fail)await route.fulfill({status:503,body:'outage'});else await route.continue();
  });
  await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
  const image=page.locator('.lh-rhythm-learn img');
  await expect(image).toHaveAttribute('data-home-image-state','error');
  await page.waitForTimeout(4500);
  const settled=attempts;
  await page.waitForTimeout(1800);
  expect(attempts).toBe(settled);
  fail=false;
  await page.context().setOffline(true);
  await page.context().setOffline(false);
  await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>100)).toBe(true);
});

test('navigation progress waits one second and disappears on arrival',async({page})=>{
  let release!:()=>void;
  const held=new Promise<void>(r=>release=r);
  await page.route(url=>url.pathname==='/zh-hant/products'&&url.searchParams.has('_rsc'),async route=>{await held;await route.continue().catch(()=>{});});
  try{
    await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
    await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
    await page.locator('.site-desktop-nav a[href="/zh-hant/products"]').click();
    await expect(page.locator('.site-navigation-pending')).toHaveCount(0);
    await page.waitForTimeout(500);
    await expect(page.locator('.site-navigation-pending')).toHaveCount(0);
    await expect(page.locator('.site-navigation-pending')).toBeAttached({timeout:1500});
    release();
    await expect(page).toHaveURL(/\/zh-hant\/products$/);
    await expect(page.locator('.site-navigation-pending')).toHaveCount(0);
  }finally{release();}
});

test('film side previews load when the carousel approaches the viewport',async({page})=>{
  await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#products')).toHaveAttribute('data-enhanced','true');
  await page.locator('.lh-films-stage').evaluate(e=>scrollTo({top:scrollY+e.getBoundingClientRect().top-150,behavior:'instant'}));
  await expect.poll(()=>page.locator('.lh-film-preview img').evaluateAll(imgs=>imgs.every(el=>{const img=el as HTMLImageElement;return img.complete&&img.naturalWidth>100;})),{timeout:4000}).toBe(true);
});
