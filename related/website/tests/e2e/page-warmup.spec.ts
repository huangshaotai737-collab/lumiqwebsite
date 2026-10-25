import {expect, test} from '@playwright/test';

const publicPages = ['/products','/story','/plans','/faq','/prelaunch','/products/ola','/products/tablet','/products/ola-go','/products/nest','/products/print','/about','/contact','/legal/privacy','/legal/terms','/legal/cookies','/legal/child-safety'];
const isRouteRequest = (url: string) => new URL(url).searchParams.has('_rsc');

test('home warms public pages and large product artwork without requesting videos or private pages', async ({page}, testInfo) => {
  test.setTimeout(60000);
  await page.setViewportSize({width:390,height:844});
  const routes: string[] = [], videos: string[] = [], images: string[] = [];
  page.on('request', req => {
    const url = new URL(req.url());
    if (isRouteRequest(req.url())) routes.push(url.pathname);
    if (/\.(mp4|webm)(?:\?|$)/i.test(req.url())) videos.push(req.url());
  });
  page.on('requestfinished', req => {
    if (req.resourceType() === 'image') images.push(decodeURIComponent(req.url()));
  });
  await page.goto('/zh-hant', {waitUntil:'domcontentloaded'});
  await expect.poll(() => publicPages.every(path => routes.includes(`/zh-hant${path}`)), {timeout:35000}).toBe(true);
  await expect.poll(() => images.some(url => url.includes('/assets/web/ola-hero-front.webp')), {timeout:15000}).toBe(true);
  expect(routes.every(path => publicPages.some(publicPath => path === `/zh-hant${publicPath}`))).toBe(true);
  expect(videos).toEqual([]);
  const warmedArtwork = images.slice();
  const resources = await page.evaluate(() => performance.getEntriesByType('resource').map(entry => {
    const resource = entry as PerformanceResourceTiming;
    return {url:resource.name, bytes:resource.encodedBodySize, duration:resource.duration};
  }));
  await testInfo.attach('warmup-evidence', {body:JSON.stringify({routes,warmedArtwork,videos,resources},null,2),contentType:'application/json'});
  const warmedRequests = routes.filter(path => path === '/zh-hant/products/ola').length;
  await page.locator('.site-mobile-trigger').click();
  await page.locator('#mobile-navigation a[href="/zh-hant/products"]').click();
  await expect(page).toHaveURL(/\/zh-hant\/products$/);
  await page.locator('.prod-comparison-list a[href="/zh-hant/products/ola"]').click();
  await expect(page).toHaveURL(/\/zh-hant\/products\/ola$/);
  await expect(page.locator('.pd-hero-visual img')).toBeVisible();
  await expect.poll(() => page.locator('.pd-hero-visual img').evaluate((img:HTMLImageElement) => img.complete && img.naturalWidth>0)).toBe(true);
  expect(warmedArtwork).toContain(decodeURIComponent(await page.locator('.pd-hero-visual img').evaluate((img:HTMLImageElement) => img.currentSrc)));
  expect(routes.filter(path => path === '/zh-hant/products/ola')).toHaveLength(warmedRequests);
});

test('slow background page requests never hold up a chosen navigation', async ({page}) => {
  const pending:string[]=[];
  let release!: () => void;
  const gate=new Promise<void>(resolve => {release=resolve;});
  // Intercept only the slow prefetches, leaving the document/TLS connection and
  // unrelated requests on the browser's normal network path.
  await page.route(url => url.searchParams.has('_rsc') && ['/en/products','/en/story'].includes(url.pathname), async route => {
    const url=new URL(route.request().url());
    pending.push(url.pathname);
    await gate;
    await route.continue().catch(()=>{});
  });
  try {
    await page.goto('/en',{waitUntil:'domcontentloaded'});
    await expect.poll(() => pending.length,{timeout:12000}).toBeGreaterThan(0);
    await page.locator('.site-desktop-nav a[href="/en/faq"]').click({timeout:2000});
    await expect(page).toHaveURL(/\/en\/faq$/, {timeout:8000});
    await expect(page.locator('h1')).toBeVisible();
  } finally {release();}
});

test('data saving skips background warming but navigation still works', async ({page}) => {
  await page.addInitScript(() => Object.defineProperty(navigator,'connection',{configurable:true,value:{saveData:true,effectiveType:'4g',addEventListener(){},removeEventListener(){}}}));
  await page.setViewportSize({width:390,height:844});
  const routes: string[] = [];
  page.on('request', req => {if(isRouteRequest(req.url())) routes.push(new URL(req.url()).pathname);});
  await page.goto('/ja', {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(6000);
  expect(routes).toEqual([]);
  await page.locator('.site-mobile-trigger').click();
  await page.locator('#mobile-navigation a[href="/ja/products"]').click();
  await expect(page).toHaveURL(/\/ja\/products$/);
  await expect(page.locator('h1')).toBeVisible();
});

test('pending opening video does not prevent warming or navigation', async ({page}) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => {release=resolve;});
  await page.route('**/ola-scroll-v16-scrub.mp4', async route => {await gate;await route.continue().catch(()=>{});});
  const routes:string[]=[];
  page.on('request', req => {if(isRouteRequest(req.url())) routes.push(new URL(req.url()).pathname);});
  try {
    await page.goto('/en', {waitUntil:'domcontentloaded'});
    await expect.poll(() => routes.includes('/en/faq'),{timeout:15000}).toBe(true);
    await page.locator('.site-desktop-nav a[href="/en/faq"]').click();
    await expect(page).toHaveURL(/\/en\/faq$/);
    await expect(page.locator('h1')).toBeVisible();
  } finally {release();}
});
