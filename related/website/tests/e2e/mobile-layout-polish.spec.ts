import {expect, test} from '@playwright/test';

// Phone chrome changes the visual height during a swipe; it must not trigger
// desktop pin restoration or an imperative scroll that interrupts momentum.
test('phone height changes and font completion do not reset native home scrolling', async ({browser}) => {
  const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page = await context.newPage();
  try {
    await page.goto(`${test.info().project.use.baseURL}/zh-hant`, {waitUntil:'networkidle'});
    await page.locator('#safety').scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const state = window as typeof window & {auditScrollCalls:number};
      state.auditScrollCalls=0;
      const original=window.scrollTo;
      window.scrollTo=((...args: Parameters<typeof original>)=>{state.auditScrollCalls++; original.apply(window,args);}) as typeof original;
    });
    const before=await page.evaluate(()=>scrollY);
    for(const height of [760,820,844]) {
      await page.setViewportSize({width:390,height});
      await page.evaluate(()=>document.fonts.dispatchEvent(new Event('loadingdone')));
      await page.waitForTimeout(400);
    }
    expect(await page.evaluate(()=>(window as typeof window & {auditScrollCalls:number}).auditScrollCalls)).toBe(0);
    expect(Math.abs(await page.evaluate(()=>scrollY)-before)).toBeLessThan(2);
    await expect(page.locator('.lh-opening-video')).not.toHaveAttribute('src');
  } finally {await context.close();}
});

test('four phone principles form two rows, retaining their links',async({page})=>{
  for(const width of [320,390,430,767]) {
    await page.setViewportSize({width,height:844});
    await page.goto('/zh-hant');
    const cards=page.locator('.lh-principle');
    await expect(cards).toHaveCount(4);
    const positions=await cards.evaluateAll(items=>items.map(e=>({r:e.getBoundingClientRect().toJSON(),href:e.getAttribute('href')})));
    expect(positions.every(x=>x.href)).toBe(true);
    expect(Math.abs(positions[0].r.y-positions[1].r.y)).toBeLessThan(1);
    expect(Math.abs(positions[2].r.y-positions[3].r.y)).toBeLessThan(1);
    expect(positions[2].r.y).toBeGreaterThan(positions[0].r.bottom);
    expect(positions[1].r.right).toBeLessThanOrEqual(width);
  }
});

test('legal and company pages share privacy backgrounds and compact phone spacing',async({page})=>{
  let backgrounds:string[]=[];
  await page.setViewportSize({width:390,height:844});
  for(const path of ['legal/privacy','legal/terms','legal/cookies','legal/child-safety','about','contact']) {
    await page.goto(`/zh-hant/${path}`);
    const m=await page.evaluate(()=>{
      const hero=document.querySelector('.subpage-hero')!,body=document.querySelector('.subpage-body')!;
      const intro=document.querySelector('.subpage-intro')!, first=body.querySelector('.prose')!.firstElementChild!;
      const heading=first.querySelector('h2')??first;
      return {backgrounds:[hero,body].map(e=>getComputedStyle(e,'::before').backgroundImage),gap:heading.getBoundingClientRect().top-intro.getBoundingClientRect().bottom,
        bodyPadding:parseFloat(getComputedStyle(body).paddingBottom), mainPadding:parseFloat(getComputedStyle(document.querySelector('main')!).paddingBottom)};
    });
    if(!backgrounds.length) backgrounds=m.backgrounds;
    expect(m.backgrounds).toEqual(backgrounds);
    expect(m.gap).toBeLessThanOrEqual(52);
    expect(m.gap).toBeGreaterThanOrEqual(16);
    expect(m.bodyPadding+m.mainPadding).toBeLessThanOrEqual(32);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
});
