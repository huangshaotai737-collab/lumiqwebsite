import {test,expect} from '@playwright/test';
for (const width of [320,360,390,430,820,1440,1920]) {
  test(`unconfigured login and safe shell at ${width}`, async ({page,request}) => {
    await page.setViewportSize({width,height:900});
    for (const route of ['/login','/']) {
      await page.goto(route);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
      await expect(page.getByRole('heading',{level:1})).toBeVisible();
    }
    for (const route of ['/api/session','/api/orders','/api/customers/list','/api/team/invites']) {
      const r=await request.get(route);
      expect(r.status()).toBeGreaterThanOrEqual(400);
      expect((await r.text())).not.toContain('"ok":true');
    }
  });
}
test('staff credentials cannot become query strings before JavaScript is ready',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false});const page=await context.newPage();
  try {await page.goto('/login');await page.getByLabel('工作邮箱').fill('synthetic@example.test');await page.getByLabel('密码',{exact:true}).fill('Synthetic-only!');await page.getByLabel('密码',{exact:true}).press('Enter');expect(new URL(page.url()).search).toBe('');await expect(page.locator('form')).toHaveAttribute('method','POST');}finally{await context.close();}
});
