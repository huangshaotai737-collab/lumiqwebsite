import {expect, test, type Page} from '@playwright/test';

test.beforeEach(({page}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1200, 'Desktop anchor suite; the phone case explicitly switches to its native layout.');
});

async function ready(page: Page, hash = '') {
  await page.goto(`/zh-hant${hash}`);
  await expect(page.locator('.lh-home')).toHaveAttribute('data-home-state', 'open');
  await expect(page.locator('.lh-loader')).toHaveAttribute('data-state', 'hidden');
}

async function at(page: Page, id: string) {
  await expect.poll(() => page.locator(id).evaluate(e => Math.abs(e.getBoundingClientRect().top))).toBeLessThan(2);
}

test('one mouse gesture lands on the second anchor, reverse returns to the first', async ({page}) => {
  await ready(page);
  await page.mouse.move(900, 450);
  await page.mouse.wheel(0, 60);
  await at(page, '#ola');
  await expect(page.locator('.lh-ola-copy')).toBeInViewport();
  await page.waitForTimeout(350);
  await page.mouse.wheel(0, -60);
  await at(page, '#top');
  expect(await page.locator('.lh-opening-stage').evaluate(e => Boolean(e.closest('.pin-spacer')))).toBe(false);
  expect(await page.locator('#ola').evaluate(e => e.getBoundingClientRect().top + scrollY)).toBeLessThanOrEqual(901);
});

test('a long trackpad tail cannot skip the second screen, and a fresh gesture can leave it', async ({page}) => {
  await ready(page);
  await page.evaluate(async () => {
    for(let i=0;i<22;i++) {
      document.querySelector('.lh-hero')!.dispatchEvent(new WheelEvent('wheel', {deltaY: Math.max(1, 50-i*3), bubbles:true,cancelable:true}));
      await new Promise(r=>setTimeout(r,60));
    }
  });
  await at(page, '#ola');
  await page.waitForTimeout(350);
  await page.mouse.move(900,450);
  await page.mouse.wheel(0,300);
  await expect.poll(()=>page.locator('#ola').evaluate(e=>e.getBoundingClientRect().top)).toBeLessThan(-80);
  await page.waitForTimeout(350);
  await page.mouse.wheel(0,-80);
  await at(page,'#ola');
});

test('line, page and pixel wheel deltas reach the same anchor', async ({page}) => {
  await ready(page);
  for(const deltaMode of [0,1,2]) {
    await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    await page.waitForTimeout(350);
    await page.evaluate(mode=>document.querySelector('.lh-hero')!.dispatchEvent(new WheelEvent('wheel',{deltaY:mode===0?1:3,deltaMode:mode,bubbles:true,cancelable:true})),deltaMode);
    await at(page,'#ola');
  }
});

test('fragment links, keyboard, resize and reduced motion retain real anchors', async ({page}) => {
  await ready(page,'#ola');
  await at(page,'#ola');
  await page.keyboard.press('PageUp');
  await at(page,'#top');
  await page.keyboard.press('PageDown');
  await at(page,'#ola');
  await page.setViewportSize({width:1280,height:720});
  await at(page,'#ola');
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening','true');
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  await page.mouse.move(900,350);
  await page.mouse.wheel(0,40);
  await at(page,'#ola');
  await expect(page.locator('.lh-ola-copy')).toBeInViewport();
});

test('phone retains native vertical scrolling and no scrubbed opening', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await ready(page);
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-opening-anchors','true');
  await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-video-mode','true');
  await page.mouse.move(200,400);
  await page.mouse.wheel(0,100);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(20);
  expect(await page.evaluate(()=>scrollY)).toBeLessThan(200);
  expect(await page.locator('.lh-opening-video').getAttribute('src')).toBeNull();
});

test('the approved film follows both anchors and decoder errors cannot block navigation', async ({page}) => {
  await ready(page);
  const movie = page.locator('.lh-opening-video');
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
  await page.mouse.move(900,450);
  await page.mouse.wheel(0,80);
  await at(page,'#ola');
  await expect.poll(()=>movie.evaluate((v: HTMLVideoElement)=>!v.seeking && v.currentTime > v.duration-.15)).toBe(true);
  const plane = await page.locator('.lh-opening-film').boundingBox();
  expect(plane!.y).toBeGreaterThan(90);
  expect(plane!.y+plane!.height).toBeLessThan(900);
  await movie.evaluate(v=>v.dispatchEvent(new Event('error')));
  await page.waitForTimeout(350);
  await page.mouse.wheel(0,-80);
  await at(page,'#top');
  await expect(page.locator('.lh-hero-copy')).toBeInViewport();
  await expect(page.locator('.lh-video-layer')).not.toHaveAttribute('data-ready','true');
});

test('pinch zoom and horizontal wheel input are not consumed by the opening', async ({page}) => {
  await ready(page);
  const consumed = await page.evaluate(()=>[
    {deltaY:80,ctrlKey:true}, {deltaX:80,deltaY:1},
  ].map(options=>{
    const e=new WheelEvent('wheel',{...options,bubbles:true,cancelable:true});
    document.querySelector('.lh-hero')!.dispatchEvent(e);
    return e.defaultPrevented;
  }));
  expect(consumed).toEqual([false,false]);
  await at(page,'#top');
});

test('English and Japanese keep their second screen readable at desktop sizes', async ({page}) => {
  for (const [locale,width,height] of [['en',1280,720],['ja',1710,900]] as const) {
    await page.setViewportSize({width,height});
    await page.goto(`/${locale}#ola`);
    await expect(page.locator('.lh-home')).toHaveAttribute('data-home-state','open');
    await at(page,'#ola');
    await expect(page.locator('.lh-ola-copy')).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});

test('changing motion preferences does not replay a stale fragment after scrolling onward', async ({page}) => {
  await ready(page,'#ola');
  await at(page,'#ola');
  await page.mouse.move(900,450);
  await page.mouse.wheel(0,300);
  await expect.poll(()=>page.locator('#ola').evaluate(e=>e.getBoundingClientRect().top)).toBeLessThan(-80);
  await page.waitForTimeout(400);
  const before = await page.locator('#ola').evaluate(e=>e.getBoundingClientRect().top);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.lh-opening')).toHaveAttribute('data-static-opening','true');
  await expect.poll(()=>page.locator('#ola').evaluate((e,y)=>Math.abs(e.getBoundingClientRect().top-y),before)).toBeLessThan(2);
});

test('the Ola film leaves with its cards before the product lineup enters', async ({page}) => {
  for (const [width,height] of [[1440,900],[2560,600]]) {
    await page.setViewportSize({width,height});
    await ready(page,'#ola');
    await at(page,'#ola');
    const positions = () => page.evaluate(() => ({
      film: document.querySelector('.lh-opening-film')!.getBoundingClientRect().top,
      cards: document.querySelector('.lh-rhythm-cards')!.getBoundingClientRect().top,
    }));
    const before = await positions();
    await page.evaluate(()=>scrollBy({top:160,behavior:'instant'}));
    await expect.poll(async()=>{
      const after = await positions();
      return Math.abs((after.film-before.film)-(after.cards-before.cards));
    }).toBeLessThan(2);
    await page.evaluate(()=>scrollTo({top:scrollY+document.querySelector('#products')!.getBoundingClientRect().top,behavior:'instant'}));
    await expect.poll(()=>page.locator('.lh-opening-film').evaluate(e=>e.getBoundingClientRect().bottom)).toBeLessThanOrEqual(0);
  }
});
