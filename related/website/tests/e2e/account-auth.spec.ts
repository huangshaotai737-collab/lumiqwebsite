import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { accountCopy } from '../../features/account/copy';
import type { Locale } from '../../lib/generated/platform/core';
const local = parseEnv(readFileSync(process.env.LUMIQ_TEST_ENV_FILE || path.resolve(__dirname, '../../../../.lumiq-local/test.env'), 'utf8'));
if (local.API_URL && local.API_URL !== 'http://127.0.0.1:54321') throw Error('Only synthetic local backend is allowed');

const backend = createClient(local.API_URL!, local.SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = 'http://127.0.0.1:4211', mail = 'http://127.0.0.1:54324';
const created: string[] = [];
function ip() { return `2001:db8:${crypto.randomUUID().slice(0, 4)}::9`; }
async function identify(context: BrowserContext) { await context.setExtraHTTPHeaders({ 'x-real-ip': ip() }); }
async function post(context: BrowserContext, url: string, data: unknown) { return context.request.post(`${origin}${url}`, { headers: { origin }, data }); }
async function mailLink(context: BrowserContext, email: string) {
    let id = '';
    await expect.poll(async () => { const r = await context.request.get(`${mail}/api/v1/messages`); const d = await r.json(); id = d.messages.find((m: {
        To: {
            Address: string;
        }[];
    }) => m.To.some(to => to.Address === email))?.ID || ''; return id; }, { timeout: 15000 }).not.toBe('');
    const message = await (await context.request.get(`${mail}/api/v1/message/${id}`)).json();
    const match = message.Text.match(/https?:\/\/[^\s<>]+\/auth\/v1\/verify\?[^\s<>]+/);
    expect(match).toBeTruthy();
    return match![0].replace(/&amp;/g, '&');
}
async function register(context: BrowserContext, locale: Locale = 'en', next?: string, page?: Page) { const email = `c1-${crypto.randomUUID()}@example.test`, password = `Synthetic-${crypto.randomUUID()}!`; let r; if (page) {
    await page.goto(`/${locale}/register`);
    await page.getByLabel(accountCopy[locale].email, { exact: true }).fill(email);
    await page.getByLabel(accountCopy[locale].password, { exact: true }).fill(password);
    const response = page.waitForResponse(r => r.url().endsWith('/api/auth/register'));
    await page.getByRole('button', { name: accountCopy[locale].register, exact: true }).click();
    r = await response;
    await expect(page.getByRole('status').filter({ hasText: accountCopy[locale].sent })).toBeVisible();
}
else
    r = await post(context, '/api/auth/register', { email, password, locale, next }); expect(r.status()).toBe(200); const { data } = await backend.auth.admin.listUsers({ page: 1, perPage: 1000 }); const user = data.users.find(u => u.email === email); expect(user).toBeTruthy(); created.push(user!.id); return { email, password, id: user!.id }; }
async function follow(page: Page, link: string) { await page.goto(link); }
test.afterAll(async () => { for (const id of created) {
    const r = await backend.auth.admin.deleteUser(id);
    expect(r.error).toBeNull();
} });
test('real_account_registration_entry', async ({ page }) => { await page.goto('/en/register'); await expect(page.getByRole('heading', { name: 'Create account', exact: true })).toBeVisible(); await expect(page.getByLabel('Email', { exact: true })).toBeVisible(); });
test('verified_email_PKCE_cookie_profile_owner_and_recovery', async ({ page, context, browser }) => {
    await identify(context);
    const account = await register(context, 'ja', undefined, page);
    const unverified = await post(context, '/api/auth/signin', { ...account, locale: 'ja' });
    expect(unverified.status()).toBe(401);
    expect((await context.request.get('/api/account/profile')).status()).toBe(401);
    const link = await mailLink(context, account.email);
    // A different browser cannot exchange the initiating browser's PKCE verifier.
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    // Resolve the real emailed verification token, then try its actual Auth code without the initiating verifier.
    const verified = await context.request.get(link, { maxRedirects: 0 });
    expect(verified.status()).toBe(303);
    const callback = verified.headers().location;
    expect(new URL(callback).searchParams.get('code')).toBeTruthy();
    await anonPage.goto(callback);
    await expect(anonPage).toHaveURL(/\/ja\/login\?error=expired/);
    await follow(page, callback);
    await expect(page).toHaveURL(`${origin}/ja/members`);
    await expect(page.getByText('ログインしています。', { exact: true })).toBeVisible();
    expect((await context.cookies()).some(c => c.name.startsWith('lumiq-website-auth') && !c.name.includes('code-verifier'))).toBe(true);
    expect((await anon.request.get(`${origin}/api/account/profile`)).status()).toBe(401);
    const own = await context.request.get('/api/account/profile');
    expect(own.headers()['cache-control']).toContain('no-store');
    expect((await own.json()).data).toEqual({ userId: account.id, displayName: '', locale: 'en', shippingAddress: null });
    const other = await backend.auth.admin.createUser({ email: `c1-b-${crypto.randomUUID()}@example.test`, password: account.password, email_confirm: true });
    expect(other.error).toBeNull();
    created.push(other.data.user!.id);
    const signed = createClient(local.API_URL!, local.ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    expect((await signed.auth.signInWithPassword({ email: account.email, password: account.password })).error).toBeNull();
    const rows = await signed.from('profiles').select('*').eq('user_id', other.data.user!.id);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(0);
    const address = { name: 'Synthetic recipient', country: 'JP', region: 'Tokyo', city: 'Tokyo', postalCode: '100', line1: 'Building A\nFloor 2', line2: 'Room 3', phone: '+81 000' };
    const update = await context.request.patch('/api/account/profile', { headers: { origin }, data: { expectedUserId:account.id, userId: other.data.user!.id, displayName: 'C1 member', locale: 'ja', shippingAddress: address, internalNotes: 'should not persist', access_state: 'suspended' } });
    expect(update.status()).toBe(200);
    expect((await update.json()).data).toEqual({ userId: account.id, displayName: 'C1 member', locale: 'ja', shippingAddress: address });
    expect((await context.request.patch('/api/account/profile', { headers: { origin }, data: { expectedUserId:account.id, displayName: 'C1', locale: 'en', shippingAddress: { ...address, country: 'ZZ' } } })).status()).toBe(400);
    await page.reload();
    await expect(page.getByLabel('表示名')).toHaveValue('C1 member');
    await expect(page.getByLabel('住所1', { exact: true })).toHaveValue('Building A\nFloor 2');
    await page.getByLabel('表示名').fill('C1 saved by form');
    await page.getByRole('button', { name: 'プロフィールを保存', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'プロフィールを保存しました。' })).toBeVisible();
    const evidence = path.resolve(__dirname, '../../../../.lumiq-local/evidence/task-9-evidence');
    mkdirSync(evidence, { recursive: true });
    await page.evaluate(()=>window.scrollTo(0,0));
    await expect(page.locator('.members-avatar strong')).toHaveText('C1 saved by form');
    await page.screenshot({ path: path.join(evidence, `${page.viewportSize()!.width}-profile.png`), fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'デバイス', exact: true }).click();
    await expect(page.getByText('デバイスサービスは未接続です。', { exact: false }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /settings|設定/i })).toHaveCount(0);
    await page.locator('.members-device-image img').evaluateAll(async images=>{await Promise.all(images.map(async image=>{const img=image as HTMLImageElement;img.loading='eager';await img.decode();}));});
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.screenshot({ path: path.join(evidence, `${page.viewportSize()!.width}-devices.png`), fullPage: true, animations: 'disabled' });
    // Repeated/expired email links and missing codes give localized feedback.
    await page.goto(link);
    await expect(page).toHaveURL(/\/ja\/login\?error=expired/);
    await expect(page.getByRole('status').filter({ hasText: '使用済み' })).toBeVisible();
    await post(context, '/api/auth/signout', {});
    await identify(context);
    expect((await post(context, '/api/auth/reset', { email: account.email, locale: 'zh-hant' })).status()).toBe(200);
    const recovery = await mailLink(context, account.email);
    await follow(page, recovery);
    await expect(page).toHaveURL(`${origin}/zh-hant/reset-password?mode=update`);
    const changed = `Changed-${crypto.randomUUID()}!`;
    await page.getByLabel('新密碼', { exact: true }).fill(changed);
    await page.getByRole('button', { name: '儲存新密碼' }).click();
    await expect(page.getByRole('status').filter({ hasText: '密碼已更新' })).toBeVisible();
    await expect(page.getByText(accountCopy['zh-hant'].expired, {exact:true})).toHaveCount(0);
    expect((await post(context, '/api/auth/signin', { email: account.email, password: account.password })).status()).toBe(401);
    expect((await post(context, '/api/auth/signin', { email: account.email, password: changed, locale: 'en' })).status()).toBe(200);
    await page.goto('/en/login');
    await expect(page.getByRole('status').filter({ hasText: 'You are signed in.' })).toBeVisible();
    await expect(page.getByText('Sign in with your verified email.')).toHaveCount(0);
    await post(context, '/api/auth/signout', {});
    await page.goto('/ja/reset-password?mode=update');
    await expect(page.getByRole('status').filter({ hasText: '使用済み' })).toBeVisible();
    await expect(page.getByRole('button', { name: '新しいパスワードを保存' })).toBeDisabled();
    await anon.close();
});
test('origin_limits_enumeration_safe_feedback_and_redirects', async ({ context, page }) => {
    await identify(context);
    const bad = await context.request.post('/api/auth/register', { headers: { origin: 'https://evil.example' }, data: { email: 'x@example.test', password: 'Synthetic123!' } });
    expect(bad.status()).toBe(403);
    await identify(context);
    for (let n = 0; n < 5; n++)
        expect((await post(context, '/api/auth/reset', { email: `unknown-${crypto.randomUUID()}@example.test` })).status()).toBe(200);
    const limited = await post(context, '/api/auth/reset', { email: 'unknown@example.test' });
    expect(limited.status()).toBe(429);
    expect(Number(limited.headers()['retry-after'])).toBeGreaterThan(0);
    await identify(context);
    for (let n = 0; n < 5; n++)
        expect((await post(context, '/api/auth/register', { email: 'bad', password: 'Synthetic123!' })).status()).toBe(400);
    expect((await post(context, '/api/auth/register', { email: 'bad', password: 'Synthetic123!' })).status()).toBe(429);
    await identify(context);
    const account = await register(context, 'zh-hant', '/safe/..//evil.example');
    await follow(page, await mailLink(context, account.email));
    await expect(page).toHaveURL(`${origin}/zh-hant/members`);
    const duplicate = await post(context, '/api/auth/register', { email: account.email, password: account.password, locale: 'zh-hant' });
    expect(duplicate.status()).toBe(200);
    expect(await duplicate.json()).toEqual({ ok: true, data: { sent: true } });
    for (const next of ['https://evil.example', '//evil.example', '/safe/%2e%2e//evil.example']) {
        const r = await post(context, '/api/auth/signin', { email: account.email, password: account.password, locale: 'ja', next });
        expect(r.status()).toBe(200);
        expect((await r.json()).data.next).toBe('/ja/members');
    }
    await page.goto('/auth/callback?locale=zh-hant');
    await expect(page).toHaveURL(/\/zh-hant\/login\?error=expired/);
    await expect(page.getByRole('status').filter({ hasText: '已使用' })).toBeVisible();
});
test('old_local_preview_and_expired_session_do_not_grant_access', async ({ page, context }) => { await page.addInitScript(() => localStorage.setItem('lumiq-member-preview-v1', JSON.stringify({ version: 1, demo: true, name: 'Fake member' }))); await page.goto('/en/members'); await expect(page.getByText('Sign in or create a verified account to save your profile.')).toBeVisible(); expect((await context.request.get('/api/account/profile')).status()).toBe(401); await expect(page.getByText('Fake member')).toHaveCount(0); });
test('session_expiry_is_visible_without_saving_local_profile', async ({ page, context }) => {
    await identify(context);
    const email = `c1-session-${crypto.randomUUID()}@example.test`, password = `Synthetic-${crypto.randomUUID()}!`;
    const createdUser = await backend.auth.admin.createUser({ email, password, email_confirm: true });
    expect(createdUser.error).toBeNull();
    created.push(createdUser.data.user!.id);
    expect((await post(context, '/api/auth/signin', { email, password })).status()).toBe(200);
    await page.goto('/en/members');
    await page.getByLabel('Display name').fill('Must not save');
    await context.clearCookies();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'expired or has already been used' })).toBeVisible();
    const stored = await backend.from('profiles').select('display_name').eq('user_id', createdUser.data.user!.id).single();
    expect(stored.data?.display_name).toBe('');
});
test('expired_real_email_token_is_rejected_with_localized_feedback', async ({ page, context }) => {
    await identify(context);
    const account = await register(context, 'en');
    const link = await mailLink(context, account.email);
    // Controlled synthetic local fixture: expire the timestamp Auth itself uses, without waiting an hour.
    expect(account.id).toMatch(/^[a-f0-9-]{36}$/);
    execFileSync('docker', ['exec', 'supabase_db_lumiq-platform', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-c', `update auth.users set confirmation_sent_at=now()-interval '2 hours' where id='${account.id}'`], { env: { ...process.env, ...(process.env.DOCKER_HOST ? {DOCKER_HOST:process.env.DOCKER_HOST} : {}) }, stdio: 'pipe' });
    await follow(page, link);
    await expect(page).toHaveURL(/\/en\/login\?error=expired/);
    await expect(page.getByRole('status').filter({ hasText: 'expired or has already been used' })).toBeVisible();
    expect((await context.request.get('/api/account/profile')).status()).toBe(401);
});

test('auth_rejections_show_actionable_form_feedback', async ({page}) => {
    let error = 'INVALID_INPUT';
    await page.route('**/api/auth/register', route => route.fulfill({
        status:error === 'INVALID_INPUT' ? 400 : 503,
        contentType:'application/json',
        body:JSON.stringify({ok:false,error,requestId:'synthetic-form-feedback'}),
    }));
    await page.route('**/api/auth/reset', route => route.fulfill({
        status:503, contentType:'application/json',
        body:JSON.stringify({ok:false,error:'UNAVAILABLE',requestId:'synthetic-form-feedback'}),
    }));
    for (const locale of ['en','zh-hant','ja'] as const) {
        const text = accountCopy[locale];
        error = 'INVALID_INPUT';
        await page.goto(`/${locale}/register`);
        await page.getByLabel(text.email,{exact:true}).fill('synthetic@example.test');
        await page.getByLabel(text.password,{exact:true}).fill('EightButWeak123');
        await page.getByRole('button',{name:text.register,exact:true}).click();
        await expect(page.getByRole('status').filter({hasText:text.invalid})).toBeVisible();
        await expect(page.getByText(text.sent,{exact:true})).toHaveCount(0);
        error = 'UNAVAILABLE';
        await page.getByRole('button',{name:text.register,exact:true}).click();
        await expect(page.getByRole('status').filter({hasText:text.unavailable})).toBeVisible();
        await page.goto(`/${locale}/reset-password`);
        await page.getByLabel(text.email,{exact:true}).fill('synthetic@example.test');
        await page.getByRole('button',{name:text.sendReset,exact:true}).click();
        await expect(page.getByRole('status').filter({hasText:text.unavailable})).toBeVisible();
        await expect(page.getByText(text.sent,{exact:true})).toHaveCount(0);
    }
});

test('register and recovery never put credentials into URLs before hydration',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false}); const page=await context.newPage();
  try {for(const route of ['register','reset-password']) {
    await page.goto(`/en/${route}`);await expect(page.locator('form')).toHaveAttribute('method','POST');await page.locator('input[name=email]').fill('synthetic-unsubmitted@example.test');
    if(route==='register')await page.locator('input[name=password]').fill('Synthetic-unsubmitted!');
    await page.locator('input').last().press('Enter');
    expect(new URL(page.url()).search).toBe('');await expect(page.locator('form')).toHaveAttribute('method','POST');
    await expect(page.locator('form button')).toBeDisabled();
  }}finally{await context.close();}
});

test('profile save persists, rather than merely reporting success',async({page,context})=>{
 const email=`c7-save-${crypto.randomUUID()}@example.test`,password=`Synthetic-${crypto.randomUUID()}!`;
 const created=await backend.auth.admin.createUser({email,password,email_confirm:true});if(created.error||!created.data.user)throw Error('Synthetic fixture failed');
 const id=created.data.user.id;
 try {
  await context.setExtraHTTPHeaders({'x-real-ip':`2001:db8:${crypto.randomUUID().slice(0,4)}::7`});
  expect((await context.request.post('/api/auth/signin',{headers:{origin},data:{email,password}})).status()).toBe(200);
  await page.goto('/en/members');await page.getByLabel('Display name',{exact:true}).fill('C7 durable saved name');
  if(process.env.LUMIQ_REGRESSION_FAULT==='fake-save') await page.route('**/api/account/profile',async route=>{
    if(route.request().method()!=='PATCH')return route.continue();
    const before=await context.request.get('/api/account/profile');const result=await before.json();
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data:{...result.data,displayName:'C7 durable saved name'}})});
  });
  await page.getByRole('button',{name:'Save profile',exact:true}).click();
  await expect(page.locator('.members-avatar strong')).toHaveText('C7 durable saved name');
  const stored=await backend.from('profiles').select('display_name').eq('user_id',id).single();
  expect(stored.data?.display_name).toBe('C7 durable saved name');
 }finally{await backend.auth.admin.deleteUser(id);}
});
