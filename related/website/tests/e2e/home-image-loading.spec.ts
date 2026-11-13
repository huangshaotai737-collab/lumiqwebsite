import {expect, test} from '@playwright/test';

test('opening and product artwork can download before the motion scripts arrive', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const images: string[] = [];
  let release!: () => void;
  const scripts = new Promise<void>(resolve => {release=resolve;});
  await page.route('**/_next/static/**/*.js', async route => {
    await scripts;
    await route.continue().catch(() => {});
  });
  page.on('request', request => {
    if (request.resourceType()==='image') images.push(decodeURIComponent(request.url()));
  });
  try {
    await page.goto('/zh-hant', {waitUntil:'commit'});
    await expect(page.locator('#products')).toBeAttached();
    await expect.poll(() => images.some(url => /learn(?:-|\.webp)/.test(url)), {timeout:5000}).toBe(true);
    await expect.poll(() => images.some(url => url.includes('tablet-pair')), {timeout:5000}).toBe(true);
    await expect(page.locator('.lh-rhythm-learn img')).not.toHaveAttribute('src', /^data:/);
  } finally {release();}
});

test('phone product previews keep the same crop as the real artwork before hydration', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  let release!: () => void;
  const scripts=new Promise<void>(resolve => {release=resolve;});
  await page.route('**/_next/static/**/*.js', async route => {
    await scripts;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/zh-hant', {waitUntil:'commit'});
    const artwork=page.locator('.lh-product-slot > a img').first();
    await expect(artwork).toHaveCSS('object-fit','contain');
    await expect(artwork).toHaveCSS('background-size','contain');
  } finally {release();}
});

test('other-page warmup waits for pending home artwork and resumes after it loads', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const routes:string[]=[];
  let requested=false;
  let release!: () => void;
  const image = new Promise<void>(resolve => {release=resolve;});
  await page.route(url => /learn(?:-|\.webp)/.test(decodeURIComponent(url.href)), async route => {
    requested=true;
    await image;
    await route.continue().catch(() => {});
  });
  page.on('request', request => {
    if (new URL(request.url()).searchParams.has('_rsc')) routes.push(request.url());
  });
  try {
    await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
    await expect.poll(() => requested).toBe(true);
    // Observe beyond the old fixed 2.4-second warmup delay.
    await page.waitForTimeout(4500);
    expect(routes).toEqual([]);
    release();
    await expect.poll(() => page.locator('.lh-rhythm-learn img').evaluate((image:HTMLImageElement) => image.complete && image.naturalWidth>100)).toBe(true);
    await expect.poll(() => routes.length, {timeout:12000}).toBeGreaterThan(0);
  } finally {release();}
});

test('a failed image keeps its preview, releases warmup, and can retry', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  let fail=true;
  const routes:string[]=[];
  await page.route(url => /learn(?:-|\.webp)/.test(decodeURIComponent(url.href)), async route => {
    if(fail) await route.fulfill({status:503,contentType:'text/plain',body:'controlled image failure'});
    else await route.continue();
  });
  page.on('request', request => {
    if(new URL(request.url()).searchParams.has('_rsc')) routes.push(request.url());
  });
  await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
  const image=page.locator('.lh-rhythm-learn img');
  await expect(image).toHaveAttribute('data-home-image-state','error');
  await expect(image).toHaveAttribute('src',/^data:image/);
  await expect.poll(() => routes.length,{timeout:12000}).toBeGreaterThan(0);
  fail=false;
  await page.evaluate(() => window.dispatchEvent(new Event('lumiq:retry-images')));
  await expect.poll(() => image.evaluate((img:HTMLImageElement) => img.complete && img.naturalWidth>100)).toBe(true);
  await expect(image).not.toHaveAttribute('src',/^data:/);
});

test('warmup yields when scrolling reveals another pending scene', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  const routes=new Set<string>();
  let requested=false;
  let release!: () => void;
  const image=new Promise<void>(resolve => {release=resolve;});
  await page.route(url => /morning(?:-|\.webp)/.test(decodeURIComponent(url.href)), async route => {
    requested=true;
    await image;
    await route.continue().catch(() => {});
  });
  page.on('request', request => {
    const url=new URL(request.url());
    if(url.searchParams.has('_rsc')) routes.add(url.pathname);
  });
  try {
    await page.goto('/zh-hant',{waitUntil:'domcontentloaded'});
    await expect.poll(() => routes.size,{timeout:12000}).toBeGreaterThan(0);
    await page.locator('#family').evaluate(e => e.scrollIntoView({block:'start',behavior:'instant'}));
    await expect.poll(() => requested).toBe(true);
    await page.waitForTimeout(1200);
    const before=routes.size;
    await page.waitForTimeout(2500);
    expect(routes.size).toBe(before);
    release();
    await expect.poll(() => routes.size,{timeout:12000}).toBeGreaterThan(before);
  } finally {release();}
});
