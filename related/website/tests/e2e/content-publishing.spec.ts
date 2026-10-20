import {test,expect,type BrowserContext} from '@playwright/test';
import {createClient} from '@supabase/supabase-js';
import {readFileSync,mkdirSync} from 'node:fs';
import {parseEnv} from 'node:util';
import path from 'node:path';
import sharp from 'sharp';
import type {ContentSnapshot} from '../../lib/generated/platform/content';
import seed from '../../lib/content/initial-snapshot.json';
const local=parseEnv(readFileSync(process.env.LUMIQ_TEST_ENV_FILE || path.resolve(__dirname,'../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/a3.env'),'utf8'));
const backend=createClient(local.API_URL!,local.SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const adminOrigin='http://127.0.0.1:4259', siteOrigin='http://127.0.0.1:4251';
let userId:string,email:string,password:string,draftId:string;
const draftTitle=`Private B4 ${Date.now()}`;
async function capturePreview(page:import('@playwright/test').Page,name:string){const dir=path.resolve(__dirname,'../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/task-8-evidence/preview');mkdirSync(dir,{recursive:true});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(dir,`${page.viewportSize()!.width}-${name}.png`),fullPage:true,animations:'disabled'});}
test.describe.configure({mode:'serial'});
test.beforeAll(async()=>{email=`b4-${crypto.randomUUID()}@example.test`;password=`Synthetic-${crypto.randomUUID()}!`;const {data,error}=await backend.auth.admin.createUser({email,password,email_confirm:true});if(error||!data.user)throw Error('Fixture create failed');userId=data.user.id;const r=await backend.from('staff_memberships').insert({user_id:userId,role:'admin',active:true});if(r.error)throw Error('Fixture role failed');});
test.afterAll(async({browser})=>{if(userId){
  const cleanup=await browser.newContext();await cleanup.request.post('http://127.0.0.1:4258/__control',{data:{mode:'normal'}});await cleanup.close();
  await backend.from('staff_memberships').update({active:true,role:'admin'}).eq('user_id',userId);
  const context=await browser.newContext();await login(context);
  const restored=await post(context,'/api/content/drafts',{id:crypto.randomUUID(),expectedVersion:0,snapshot:seed});
  await post(context,'/api/content/publish',{id:restored.id,expectedVersion:restored.version});
  await context.close();await backend.auth.admin.deleteUser(userId);
}});
async function login(context:BrowserContext,origin=adminOrigin){await context.setExtraHTTPHeaders({'x-real-ip':`2001:db8:${crypto.randomUUID().slice(0,4)}::8`});expect((await context.request.post(`${origin}/api/auth/signin`,{headers:{origin},data:{email,password}})).status()).toBe(200);}
async function post(context:BrowserContext,route:string,data:unknown){const r=await context.request.post(`${adminOrigin}${route}`,{headers:{origin:adminOrigin},data});expect(r.status()).toBe(200);return (await r.json()).data;}
test('publish_updates_three_locales',async({page,context,browser})=>{
  await login(context);
  draftId=(await post(context,'/api/content/drafts',{action:'create'})).id;
  const draft=(await (await context.request.get(`${adminOrigin}/api/content/drafts?id=${draftId}`)).json()).data;
  const snapshot=structuredClone(seed) as ContentSnapshot;
  for(const locale of ['en','zh-hant','ja'] as const)(snapshot.messages[locale].HomeRefresh as Record<string,string>).hero1=draftTitle;
  const saved=await post(context,'/api/content/drafts',{id:draftId,expectedVersion:draft.version,snapshot});
  await page.goto(`${adminOrigin}/content/${draftId}`);await expect(page.getByRole('link',{name:'预览已保存草稿'})).toHaveAttribute('href',`${siteOrigin}/en/preview/${draftId}?page=%2F`);
  const anonymous=await browser.newContext();const publicPage=await anonymous.newPage();await publicPage.goto('/en');await expect(publicPage.locator('#hero-title')).not.toContainText(draftTitle);
  await post(context,'/api/content/publish',{id:draftId,expectedVersion:saved.version});
  for(const locale of ['en','zh-hant','ja']){await page.goto(`/${locale}`);await expect(page.locator('#hero-title')).toContainText(draftTitle,{timeout:60_000});}
  await anonymous.close();
});
test('database_failure_invalid_schema_and_empty_pointer_retain_last_good',async({page,request})=>{
  await page.goto('/en');await expect(page.locator('#hero-title')).toContainText(draftTitle);
  try {for(const mode of ['failed','invalid','empty']) {
    expect((await request.post('http://127.0.0.1:4258/__control',{data:{mode}})).status()).toBe(204);
    const response=await page.goto('/en');expect(response?.status()).toBe(200);
    await expect(page.locator('#hero-title')).toContainText(draftTitle);
    expect(response?.headers()['set-cookie']||'').not.toContain('lumiq-website-auth');
  }}finally {await request.post('http://127.0.0.1:4258/__control',{data:{mode:'normal'}});}
});
test('private_preview_never_leaks',async({context,page,browser})=>{
  await login(context);const created=await post(context,'/api/content/drafts',{action:'create'});draftId=created.id;
  const draft=(await (await context.request.get(`${adminOrigin}/api/content/drafts?id=${draftId}`)).json()).data;
  const snapshot=structuredClone(seed) as ContentSnapshot;(snapshot.messages.en.HomeRefresh as Record<string,string>).hero1=`Unpublished ${draftTitle}`;
  await post(context,'/api/content/drafts',{id:draftId,expectedVersion:draft.version,snapshot});
  const anon=await browser.newContext();
  for(const route of [`/en/preview/${draftId}`, '/en']){const r=await anon.request.get(route,{headers:{'x-lumiq-preview-draft':draftId}});expect(await r.text()).not.toContain(`Unpublished ${draftTitle}`);}
  // Admin cookie alone does not authenticate the website.
  await page.goto(`/en/preview/${draftId}`);await expect(page).toHaveURL(/\/en\/login\?next=/);await expect(page.locator('#hero-title')).not.toBeVisible();
  await login(context,siteOrigin);
  const forged=await context.request.get('/en',{headers:{'x-lumiq-preview-draft':draftId,'x-lumiq-preview-path':`/en/preview/${draftId}`}});expect(await forged.text()).not.toContain(`Unpublished ${draftTitle}`);
  const response=await page.goto(`/en/preview/${draftId}?page=%2F`);
  await expect(page.locator('#hero-title')).toContainText(`Unpublished ${draftTitle}`);
  expect(response?.headers()['cache-control']).toContain('no-store');expect(response?.headers()['x-robots-tag']).toContain('noindex');
  await page.setViewportSize({width:page.viewportSize()!.width<500?390:1440,height:900});await page.emulateMedia({reducedMotion:'reduce'});await capturePreview(page,'home-draft');
  await backend.from('staff_memberships').update({active:false}).eq('user_id',userId);
  const revoked=await context.request.get(`/en/preview/${draftId}`);expect(await revoked.text()).not.toContain(`Unpublished ${draftTitle}`);
  await anon.close();
});

test('draft_media_requires_current_staff_and_never_enters_public_optimizer',async({context,page,browser})=>{
  await backend.from('staff_memberships').update({active:true}).eq('user_id',userId);await login(context);
  const bytes=await sharp({create:{width:64,height:64,channels:3,background:'#417ac5'}}).png().toBuffer();
  const upload=await post(context,'/api/media/upload',{fileName:'b4-synthetic.png',size:bytes.length,mime:'image/png',profile:'asset_137d79f5442fc11a'});
  expect((await context.request.put(upload.uploadUrl,{headers:{'Content-Type':'image/png'},data:bytes})).status()).toBe(200);
  const slot=await post(context,'/api/media/complete',{assetId:upload.assetId});
  const snapshot=structuredClone(seed) as ContentSnapshot;snapshot.media.asset_137d79f5442fc11a=slot;
  snapshot.products.tablet.name='B4 tablet reference';snapshot.products.tablet.price={kind:'usd',amount:432.25};
  const saved=await post(context,'/api/content/drafts',{id:crypto.randomUUID(),expectedVersion:0,snapshot});
  const privateUrl=`/api/content/preview-media/${upload.assetId}`;
  const anon=await browser.newContext();expect((await anon.request.get(privateUrl)).status()).toBe(401);
  expect((await context.request.get(privateUrl)).status()).toBe(401);
  expect((await anon.request.get(`/api/media/${upload.assetId}`)).status()).toBe(404);
  await login(context,siteOrigin);
  const media=await context.request.get(privateUrl);expect(media.status()).toBe(200);expect(await media.body()).toEqual(bytes);expect(media.headers()['cache-control']).toContain('no-store');
  for(const encoded of [privateUrl,encodeURIComponent(privateUrl)]){const optimizer=await context.request.get(`/_next/image?url=${encodeURIComponent(encoded)}&w=640&q=75`);expect(optimizer.status()).toBe(400);expect(optimizer.headers()['cache-control']).toContain('no-store');}
  await page.goto(`/en/preview/${saved.id}?page=%2Fproducts%2Ftablet`);
  const image=page.locator('.pd-hero-visual img');await expect(image).toHaveAttribute('src',privateUrl);await expect(image).toHaveJSProperty('naturalWidth',64);
  await page.setViewportSize({width:page.viewportSize()!.width<500?390:1440,height:900});await capturePreview(page,'tablet-private-media');
  await expect(page.locator('.pd-product-name')).toHaveText('B4 tablet reference');await expect(page.locator('.pd-price').first()).toHaveText('USD 432.25');
  await page.locator('[data-cart-add="tablet"]').first().click();await expect(page.locator('.cart-product-name')).toHaveText('B4 tablet reference');await expect(page.locator('.cart-total')).toContainText('432.25');
  await backend.from('staff_memberships').update({role:'operations'}).eq('user_id',userId);expect((await context.request.get(privateUrl)).status()).toBe(403);
  const denied=await context.request.get(`/en/preview/${saved.id}?page=%2Fproducts%2Ftablet`);expect(await denied.text()).not.toContain('B4 tablet reference');
  await backend.from('staff_memberships').update({role:'admin',active:false}).eq('user_id',userId);expect((await context.request.get(privateUrl)).status()).toBe(403);
  await backend.from('staff_memberships').update({active:true}).eq('user_id',userId);
  // A failed publication cannot expose an original, change the pointer, or poison the website.
  const before=await backend.rpc('get_published_content');
  await backend.storage.updateBucket('media-releases',{public:false,fileSizeLimit:1});
  try {const failed=await context.request.post(`${adminOrigin}/api/content/publish`,{headers:{origin:adminOrigin},data:{id:saved.id,expectedVersion:saved.version}});expect(failed.status()).toBe(503);expect((await anon.request.get(`/api/media/${upload.assetId}`)).status()).toBe(404);expect((await backend.rpc('get_published_content')).data?.releaseId).toBe(before.data?.releaseId);} finally {await backend.storage.updateBucket('media-releases',{public:false,fileSizeLimit:52428800});}
  await post(context,'/api/content/publish',{id:saved.id,expectedVersion:saved.version});
  const published=await anon.request.get(`/api/media/${upload.assetId}`);expect(published.status()).toBe(200);expect(await published.body()).toEqual(bytes);expect(published.headers()['cache-control']).toContain('immutable');
  await page.goto('/en/products/tablet');await expect(page.locator('.pd-hero-visual img')).toHaveAttribute('src',`/api/media/${upload.assetId}`);
  await anon.close();
});
