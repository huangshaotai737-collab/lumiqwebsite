import {expect,test} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import manifest from '../../lib/content/field-manifest.json';
const evidence=path.resolve(__dirname,'../../../../.lumiq-local/evidence/task-8-evidence/after');
for(const width of [390,1440])for(const route of manifest.pages.filter(page=>page.startsWith('/')))test(`manifest ${width} ${route}`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:'reduce'});
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(`/en${route==='/'?'':route}`);expect(response?.status()).toBe(200);
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('main')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  expect(errors).toEqual([]);
  expect(response?.headers()['set-cookie']||'').not.toContain('lumiq-website-auth');
  mkdirSync(evidence,{recursive:true});
  await page.screenshot({path:path.join(evidence,`${width}-${route==='/'?'home':route.slice(1).replaceAll('/','-')}.png`),fullPage:true,animations:'disabled'});
});
