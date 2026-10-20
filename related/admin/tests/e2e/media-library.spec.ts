import { expect, test, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import path from 'node:path';
import initialSnapshot from '../../features/content/initial-snapshot.json';
import type { ContentSnapshot } from '../../lib/generated/platform/content';
import { syntheticImage, syntheticVideo } from '../../features/media/fixtures';
const local = parseEnv(readFileSync(process.env.LUMIQ_TEST_ENV_FILE || path.resolve(__dirname, '../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/a3.env'), 'utf8'));
const backend = createClient(local.API_URL!, local.SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(local.API_URL!, local.ANON_KEY!, { auth: { persistSession: false } });
const password = `Synthetic-${crypto.randomUUID()}!`; const origin = 'http://127.0.0.1:4260'; const website = 'http://127.0.0.1:4261';
const users: Record<string, { id: string; email: string }> = {};
let imageId: string; let draftId: string; let releaseId: string; let snapshot: ContentSnapshot; // Full synthetic snapshot is modified through real server APIs.
const uploadUrls = new Map<string, string>();
const boundaryPrefix = `b3-picker-${crypto.randomUUID()}`;
function fixtureSql(sql: string) { return execFileSync('docker',['exec','-i','supabase_db_lumiq-platform','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres'],{input:sql,env:{...process.env,DOCKER_HOST:'unix:///Users/huangshaotai/.colima/lumiq-platform/docker.sock'},encoding:'utf8'}); }
const usage = 'asset_012d3bf8af92d486';
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  for (const role of ['admin','editor','operations']) {
    const email = `b3-${Date.now()}-${role}@example.test`; const created = await backend.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw new Error('synthetic account creation failed'); users[role] = { id: created.data.user.id, email };
    const staff = await backend.from('staff_memberships').insert({ user_id: created.data.user.id, role, active: true }); if (staff.error) throw new Error('staff setup failed');
  }
});
test.afterAll(async () => { fixtureSql(`delete from public.media_assets where original_path like '${boundaryPrefix}/%';`); await backend.storage.updateBucket('media-releases', { public: false, fileSizeLimit: 52428800 }); for (const user of Object.values(users)) await backend.auth.admin.deleteUser(user.id); });
async function login(context: BrowserContext, role: string) {
  await context.setExtraHTTPHeaders({ 'x-real-ip': `2001:db8:${crypto.randomUUID().slice(0,4)}::7` });
  expect((await context.request.post(`${origin}/api/auth/signin`, { headers: { origin }, data: { email: users[role].email, password } })).status()).toBe(200);
}
const post = (context: BrowserContext, url: string, data: unknown) => context.request.post(`${origin}${url}`, { headers: { origin }, data });
async function upload(context: BrowserContext, bytes: Buffer, profile = usage, mime = 'image/png', advertised = bytes.length) {
  const created = await post(context, '/api/media/upload', { fileName: 'synthetic.' + (mime.startsWith('video') ? 'mp4' : 'png'), size: advertised, mime, profile }); expect(created.status()).toBe(200);
  const body = (await created.json()).data; uploadUrls.set(body.assetId, body.uploadUrl);
  const sent = await context.request.put(body.uploadUrl, { headers: { 'Content-Type': mime, 'cache-control': 'no-store' }, data: bytes }); expect(sent.status()).toBe(200);
  return body.assetId as string;
}
test('real staff upload and private no-store preview; no anonymous originals or optimizer', async ({ page, context, browser }) => {
  expect((await post(context, '/api/media/upload', {})).status()).toBe(401);
  const ops = await browser.newContext(); await login(ops, 'operations'); expect((await post(ops, '/api/media/upload', {})).status()).toBe(403); await ops.close();
  await login(context, 'editor'); await page.goto('/media'); await page.getByLabel('素材用途').selectOption(usage);
  await page.getByLabel('选择文件').setInputFiles({ name: 'synthetic-blue.png', mimeType: 'image/png', buffer: syntheticImage });
  const complete = page.waitForResponse(response => response.url().endsWith('/api/media/complete'));
  await page.getByRole('button', { name: '上传并校验' }).click(); const completed = await complete;
  expect(completed.status()).toBe(200); imageId = (await completed.json()).data.assetId;
  await expect(page.locator('form').getByRole('status')).toContainText('素材已校验');
  const preview = await context.request.get(`${origin}/api/media/preview?assetId=${imageId}`); expect(preview.status()).toBe(200); expect(preview.headers()['cache-control']).toContain('no-store'); expect(await preview.body()).toEqual(syntheticImage);
  await expect(page.locator('.media-library img').first()).toHaveJSProperty('naturalWidth', 64); expect(await page.locator('.media-library img').first().getAttribute('src')).not.toContain('/_next/image');
  const privateOriginal = await anon.storage.from('media-originals').download(`${users.editor.id}/${imageId}`); expect(privateOriginal.error).not.toBeNull();
  expect((await context.request.get(`${website}/api/media/${imageId}`)).status()).toBe(404);
  const evidence=path.resolve(__dirname,'../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/task-7-evidence');mkdirSync(evidence,{recursive:true});
  await page.screenshot({path:path.join(evidence,'media-library-desktop.png'),fullPage:true});
  for(const width of [320,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(node=>node.getBoundingClientRect().right>innerWidth+1).map(node=>({tag:node.tagName,class:node.className,width:node.getBoundingClientRect().width,right:node.getBoundingClientRect().right})).slice(-8))).toEqual([]);await page.screenshot({path:path.join(evidence,`media-library-${width}.png`),fullPage:true});}
  await page.getByLabel('素材用途').selectOption('asset_a6510e681604d2f9'); await expect(page.getByRole('note')).toContainText('MOV'); await expect(page.getByRole('button', { name: '上传并校验' })).toHaveCount(0);
});
test('disguised_html_is_rejected, real size and foreign actor metadata are enforced', async ({ context, browser }) => {
  await login(context,'editor');
  const html = Buffer.from('<!doctype html><script>bad()</script>'); const htmlId = await upload(context,html,usage,'image/jpeg');
  const rejected = await post(context,'/api/media/complete',{assetId:htmlId}); expect(rejected.status()).toBe(400); expect((await rejected.json()).error).toBe('INVALID_INPUT');
  const wrongSize = await upload(context,syntheticImage,usage,'image/png',syntheticImage.length+1); expect((await post(context,'/api/media/complete',{assetId:wrongSize})).status()).toBe(400);
  const foreign = await upload(context,syntheticImage);
  expect((await context.request.put(uploadUrls.get(foreign)!,{headers:{'Content-Type':'image/png','x-upsert':'true'},data:Buffer.from('replacement')})).status()).not.toBe(200); const admin = await browser.newContext(); await login(admin,'admin'); expect((await post(admin,'/api/media/complete',{assetId:foreign})).status()).toBe(403); await admin.close();
  const shortOpening = await upload(context,syntheticVideo,'asset_a4b2063e90484449','video/mp4'); expect((await post(context,'/api/media/complete',{assetId:shortOpening})).status()).toBe(400);
});
test('failed_media_publish_stays_private and exact snapshot publication; archival preserves URL and rollback', async ({ context, page }) => {
  await login(context,'admin');
  const created = await post(context,'/api/content/drafts',{id:crypto.randomUUID(),expectedVersion:0,snapshot:initialSnapshot}); expect(created.status()).toBe(200); draftId=(await created.json()).data.id;
  const loaded=await context.request.get(`${origin}/api/content/drafts?id=${draftId}`); const draft=(await loaded.json()).data; snapshot=draft.snapshot;
  snapshot.media[usage] = {...snapshot.media[usage],assetId:imageId,url:`/api/media/${imageId}`};
  const saved=await post(context,'/api/content/drafts',{id:draftId,expectedVersion:draft.version,snapshot}); expect(saved.status()).toBe(200); const version=(await saved.json()).data.version;
  const before = await anon.rpc('get_published_content');
  expect((await backend.storage.updateBucket('media-releases',{public:false,fileSizeLimit:1})).error).toBeNull();
  try {
    expect((await post(context,'/api/content/publish',{id:draftId,expectedVersion:version})).status()).toBe(503);
    const publicResponse=await context.request.get(`${website}/api/media/${imageId}`); expect(publicResponse.status()).toBe(404);
    const after=await anon.rpc('get_published_content'); expect(after.data?.releaseId).toBe(before.data?.releaseId);
  } finally { expect((await backend.storage.updateBucket('media-releases',{public:false,fileSizeLimit:52428800})).error).toBeNull(); }
  const published=await post(context,'/api/content/publish',{id:draftId,expectedVersion:version}); expect(published.status()).toBe(200); releaseId=(await published.json()).data.releaseId;
  const delivered=await context.request.get(`${website}/api/media/${imageId}`); expect(delivered.status()).toBe(200); expect(delivered.headers()['cache-control']).toContain('immutable'); expect(await delivered.body()).toEqual(syntheticImage);
  const proof=await anon.rpc('get_public_asset',{asset_id:imageId}); expect(proof.error).toBeNull(); const releasePath=(proof.data as {path:string}).path;
  expect(releasePath).toMatch(new RegExp(`^releases/${imageId}/[a-f0-9]{64}$`));
  const existingCopy=await backend.storage.from('media-releases').download(releasePath);expect(existingCopy.error).toBeNull();expect(Buffer.from(await existingCopy.data!.arrayBuffer())).toEqual(syntheticImage);
  const copied=await anon.storage.from('media-releases').download(releasePath); expect(copied.error).not.toBeNull();
  await page.goto(`/content/${draftId}`); await page.getByLabel('字段分组').selectOption('media'); await page.getByLabel('搜索字段').fill(`media.${usage}.assetId`); await expect(page.locator(`[id="field-media.${usage}.assetId"]`)).toHaveValue(imageId);
  expect((await post(context,'/api/media/archive',{assetId:imageId})).status()).toBe(200);
  expect((await context.request.get(`${website}/api/media/${imageId}`)).status()).toBe(200);
  const newDraft=await post(context,'/api/content/drafts',{action:'create'}); expect(newDraft.status()).toBe(200);
  const inherited=(await newDraft.json()).data;
  const inheritedResponse=await context.request.get(`${origin}/api/content/drafts?id=${inherited.id}`); const inheritedDraft=(await inheritedResponse.json()).data;
  inheritedDraft.snapshot.products.ola.name='B3 unrelated edit after archive';
  const inheritedSave=await post(context,'/api/content/drafts',{id:inherited.id,expectedVersion:inheritedDraft.version,snapshot:inheritedDraft.snapshot}); expect(inheritedSave.status()).toBe(200);
  expect((await post(context,'/api/content/publish',{id:inherited.id,expectedVersion:(await inheritedSave.json()).data.version})).status()).toBe(200);
  expect((await context.request.get(`${website}/api/media/${imageId}`)).status()).toBe(200);
  const forged=structuredClone(inheritedDraft.snapshot); forged.media.asset_05056f38e42fe55d={...forged.media.asset_05056f38e42fe55d,assetId:imageId,url:`/api/media/${imageId}`};
  expect((await post(context,'/api/content/drafts',{id:crypto.randomUUID(),expectedVersion:0,snapshot:forged})).status()).toBe(400);
  const rollback=await post(context,'/api/content/rollback',{releaseId}); expect(rollback.status()).toBe(200);
});

test('paired film/poster transaction prevents orphan exposure and delivers actual seekable video', async ({context,page}) => {
  await login(context,'admin');
  const videoUsage='asset_3f0e57544d2610e7', posterUsage='asset_c5465b6816a75f09';
  const videoId=await upload(context,syntheticVideo,videoUsage,'video/mp4'); expect((await post(context,'/api/media/complete',{assetId:videoId})).status()).toBe(200);
  const posterId=await upload(context,syntheticImage,posterUsage); expect((await post(context,'/api/media/complete',{assetId:posterId})).status()).toBe(200);
  const value=structuredClone(initialSnapshot) as ContentSnapshot; value.media[videoUsage]={...value.media[videoUsage],assetId:videoId,url:`/api/media/${videoId}`};
  const id=crypto.randomUUID(); const saved=await post(context,'/api/content/drafts',{id,expectedVersion:0,snapshot:value}); expect(saved.status()).toBe(200); let version=(await saved.json()).data.version;
  const before=await anon.rpc('get_published_content');
  expect((await post(context,'/api/content/publish',{id,expectedVersion:version})).status()).toBe(400);
  expect((await context.request.get(`${website}/api/media/${videoId}`)).status()).toBe(404); expect((await anon.rpc('get_published_content')).data?.releaseId).toBe(before.data?.releaseId);
  value.media[posterUsage]={...value.media[posterUsage],assetId:posterId,url:`/api/media/${posterId}`};
  const paired=await post(context,'/api/content/drafts',{id,expectedVersion:version,snapshot:value}); expect(paired.status()).toBe(200); version=(await paired.json()).data.version;
  expect((await post(context,'/api/content/publish',{id,expectedVersion:version})).status()).toBe(200);
  const range=await context.request.get(`${website}/api/media/${videoId}`,{headers:{Range:'bytes=10-29'}}); expect(range.status()).toBe(206); expect(await range.body()).toEqual(syntheticVideo.subarray(10,30));
  await page.setContent(`<video controls muted src="${website}/api/media/${videoId}"></video>`);
  await expect.poll(()=>page.locator('video').evaluate(video=>(video as HTMLVideoElement).duration)).toBe(0.5);
  await page.locator('video').evaluate(video=>{(video as HTMLVideoElement).currentTime=0.25;});
  await expect.poll(()=>page.locator('video').evaluate(video=>(video as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
});

test('older ready media remains discoverable and selectable beyond 200 newer attempts', async ({context,page,browser})=>{
  await login(context,'admin');
  const target=await upload(context,syntheticImage);expect((await post(context,'/api/media/complete',{assetId:target})).status()).toBe(200);
  fixtureSql(`insert into public.media_assets(created_by,file_name,advertised_size,mime,usage_key,original_path,status,created_at)
    select '${users.admin.id}','boundary-attempt-'||n,1,'image/png','${usage}','${boundaryPrefix}/attempt-'||n,case when n%2=0 then 'pending' else 'archived' end,now()+interval '1 day' from generate_series(1,201) n;
    insert into public.media_assets(created_by,file_name,advertised_size,mime,usage_key,original_path,status,created_at)
    select '${users.admin.id}','boundary-ready-'||n,1,'image/png','${usage}','${boundaryPrefix}/ready-'||n,'ready',now()+interval '1 day' from generate_series(1,26) n;`);
  const created=await post(context,'/api/content/drafts',{id:crypto.randomUUID(),expectedVersion:0,snapshot:initialSnapshot});expect(created.status()).toBe(200);const draft=(await created.json()).data;
  await page.goto(`/content/${draft.id}`);await page.getByLabel('字段分组').selectOption('media');await page.getByLabel('搜索字段').fill(`media.${usage}.assetId`);
  const picker=page.locator(`[id="field-media.${usage}.assetId"]`);const field=page.locator('.content-field').filter({has:picker});
  await field.getByRole('button',{name:'查找素材',exact:true}).click();
  await expect(picker.locator(`option[value="${target}"]`)).toHaveCount(0);
  await field.getByRole('button',{name:'下一页素材',exact:true}).click();await expect(picker.locator(`option[value="${target}"]`)).toHaveCount(1);
  await picker.selectOption(target);await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'草稿已保存'})).toBeVisible();
  const saved=await context.request.get(`${origin}/api/content/drafts?id=${draft.id}`);expect((await saved.json()).data.snapshot.media[usage].assetId).toBe(target);
  await field.getByLabel('按文件名或编号查找素材').fill(target);await field.getByRole('button',{name:'查找素材',exact:true}).click();await expect(picker.locator(`option[value="${target}"]`)).toHaveCount(1);await expect(field.getByRole('button',{name:'下一页素材',exact:true})).toBeDisabled();
  const options=await context.request.get(`${origin}/api/media/options?usageKey=${usage}&q=${target}`);expect(options.status()).toBe(200);expect(options.headers()['cache-control']).toContain('no-store');expect((await options.json()).data.items).toHaveLength(1);
  const outsider=await browser.newContext();expect((await outsider.request.get(`${origin}/api/media/options?usageKey=${usage}`)).status()).toBe(401);await login(outsider,'operations');expect((await outsider.request.get(`${origin}/api/media/options?usageKey=${usage}`)).status()).toBe(403);await outsider.close();
});
