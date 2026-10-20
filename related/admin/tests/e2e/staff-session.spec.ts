import { expect, test, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
const local = parseEnv(readFileSync(process.env.LUMIQ_TEST_ENV_FILE || path.resolve(__dirname,'../../../../.lumiq-local/test.env'),'utf8'));
if (local.API_URL && local.API_URL !== 'http://127.0.0.1:54321') throw Error('Only synthetic local backend is allowed');

const backend = createClient(local.API_URL!,local.SERVICE_ROLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const publicClient = () => createClient(local.API_URL!,local.ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
const password = `Synthetic-${crypto.randomUUID()}!`;
const addressPrefix = '2001:db8:' + crypto.randomUUID().replaceAll('-','').slice(0,12).match(/.{4}/g)!.join(':');
const ipAddress = (suffix:number) => `${addressPrefix}::${suffix}`;
const prefix = `a3-${Date.now()}`;
let staffId:string;
let memberId:string;
const staffEmail = `${prefix}-staff@example.test`;
const memberEmail = `${prefix}-member@example.test`;
test.describe.configure({mode:'serial'});
test.beforeAll(async()=> {
  for(const [email,staff] of [[staffEmail,true],[memberEmail,false]] as const) {
    const {data,error} = await backend.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{role:'admin',active:true}});
    if(error || !data.user) throw new Error('Synthetic account setup failed');
    if(staff) staffId=data.user.id; else memberId=data.user.id;
  }
  const {error} = await backend.from('staff_memberships').insert({user_id:staffId,role:'admin',active:true});
  if(error) throw new Error('Synthetic membership setup failed');
});
test.afterAll(async()=> {
  if(staffId) await backend.auth.admin.deleteUser(staffId);
  if(memberId) await backend.auth.admin.deleteUser(memberId);
});
async function login(context:BrowserContext,email:string,ip:string,next='/') {
  return context.request.post('/api/auth/signin',{headers:{origin:'http://127.0.0.1:4253','x-real-ip':ip},data:{email,password,next}});
}
async function expireCookie(context:BrowserContext,name:string,invalidRefresh:boolean) {
    const cookies = (await context.cookies()).filter(cookie=>cookie.name.startsWith(name)).sort((a,b)=>a.name.localeCompare(b.name));
    const combined = cookies.map(cookie=>cookie.value).join('');
    expect(combined.startsWith('base64-')).toBe(true);
    const session = JSON.parse(Buffer.from(combined.slice(7),'base64url').toString('utf8'));
    session.expires_at = 1;
    if(invalidRefresh) session.refresh_token = 'expired-synthetic-refresh-token';
    await context.clearCookies({name:new RegExp(`^${name}`)});
    const cookie = cookies[0];
    await context.addCookies([{name,value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:cookie.domain,path:cookie.path,secure:cookie.secure,httpOnly:cookie.httpOnly,sameSite:cookie.sameSite}]);
    return session.refresh_token;
  }

test('anonymous_is_401_and_metadata_member_is_403',async({context})=> {
  const anonymous = await context.request.get('/api/session');
  expect(anonymous.status()).toBe(401);
  expect(anonymous.headers()['cache-control']).toContain('no-store');
  const member = await login(context,memberEmail,ipAddress(11));
  expect(member.status()).toBe(403);
  const client = publicClient();
  const {data,error} = await client.auth.signInWithPassword({email:memberEmail,password});
  expect(error).toBeNull();
  expect(data.user?.id).toBe(memberId);
  const elevate = await client.from('staff_memberships').insert({user_id:memberId,role:'admin',active:true});
  expect(elevate.error).not.toBeNull();
  const state = await client.from('profiles').update({access_state:'active'}).eq('user_id',memberId);
  expect(state.error).not.toBeNull();
  const limiter = await client.rpc('consume_request_limit',{scope:'signin',subject_hash:'a'.repeat(64)});
  expect(limiter.error).not.toBeNull();
});
test('disabled_staff_session_is_rejected',async({context,page})=> {
  await context.setExtraHTTPHeaders({'x-real-ip':ipAddress(12)});
  await page.goto('/login');
  await page.getByLabel('工作邮箱').fill(staffEmail);
  await page.getByLabel('密码',{exact:true}).fill(password);
  await page.getByRole('button',{name:'登录',exact:true}).click();
  await expect(page.getByRole('heading',{name:'欢迎回来'})).toBeVisible();
  expect((await context.request.get('/api/session')).status()).toBe(200);
  const oldCookies = (await context.cookies()).filter(cookie=>cookie.name.startsWith('lumiq-admin-auth'));
  expect(oldCookies.length).toBeGreaterThan(0);
  expect(new URL(page.url()).search).toBe('');
  const {error} = await backend.from('staff_memberships').update({active:false}).eq('user_id',staffId);
  expect(error).toBeNull();
  const response = await context.request.get('/api/session');
  expect(response.status()).toBe(403);
  expect((await context.cookies()).filter(cookie=>cookie.name.startsWith('lumiq-admin-auth'))).toEqual(oldCookies);
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('当前账号没有有效的员工权限');
  await backend.from('staff_memberships').update({active:true}).eq('user_id',staffId);
});
test('cross_origin_writes_are_403_and_signout_clears_session',async({context,page})=> {
  expect((await login(context,staffEmail,ipAddress(13))).status()).toBe(200);
  for(const pathname of ['/api/auth/signin','/api/auth/signout']) {
    const response = await context.request.post(pathname,{headers:{origin:'https://evil.example'},data:{email:staffEmail,password}});
    expect(response.status()).toBe(403);
  }
  const missing = await context.request.post('/api/auth/signout');
  expect(missing.status()).toBe(403);
  await page.goto('/');
  await page.getByRole('button',{name:'退出登录'}).click();
  await expect(page.getByRole('status')).toContainText('已安全退出登录');
  expect((await context.request.get('/api/session')).status()).toBe(401);
});
test('reject_external_auth_redirect_and_handle_expired_callback',async({context,page})=> {
  for(const next of ['https://evil.example','//evil.example','/safe/..//evil.example','/safe/%2e%2e//evil.example','/safe/.%2e//evil.example','/safe/%2E.//evil.example']) {
    const response = await login(context,staffEmail,ipAddress(14),next);
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.data.next).toBe('/');
    expect(new URL(result.data.next,'http://127.0.0.1:4253').origin).toBe('http://127.0.0.1:4253');
  }
  await page.goto('/auth/callback?next=https://evil.example');
  await expect(page).toHaveURL(/\/login\?error=expired$/);
  await expect(page.getByRole('status')).toContainText('验证链接已失效');
});
test('limits_are_shared_between_two_app_instances',async({context})=> {
  const urls = ['http://127.0.0.1:4253','http://127.0.0.1:4254'];
  const results = await Promise.all(Array.from({length:12},(_,index)=>context.request.post(`${urls[index%2]}/api/auth/signin`,{headers:{origin:urls[index%2],'x-real-ip':ipAddress(15)},data:{}})));
  expect(results.filter(response=>response.status()===400)).toHaveLength(10);
  expect(results.filter(response=>response.status()===429)).toHaveLength(2);
  expect(results.find(response=>response.status()===429)?.headers()['retry-after']).toBeTruthy();
});
test('website_locales_login_and_current_profile_denial',async({context,page})=> {
  await context.setExtraHTTPHeaders({'x-real-ip':ipAddress(16)});
  await page.setViewportSize({width:320,height:740});
  for(const locale of ['en','zh-hant','ja']) {
    await page.goto(`http://127.0.0.1:4254/${locale}/login`);
    await expect(page.locator('input[type=email]')).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  }
  const signedIn = await context.request.post('http://127.0.0.1:4254/api/auth/signin',{headers:{origin:'http://127.0.0.1:4254','x-real-ip':ipAddress(16)},data:{email:memberEmail,password,locale:'ja',next:'//evil.example'}});
  expect(signedIn.status()).toBe(200);
  expect((await signedIn.json()).data.next).toBe('/ja/members');
  const websiteCookies = (await context.cookies()).filter(cookie=>cookie.name.startsWith('lumiq-website-auth'));
  expect(websiteCookies.length).toBeGreaterThan(0);
  const previousRefresh = await expireCookie(context,'lumiq-website-auth',false);
  const loginPage = await page.goto('http://127.0.0.1:4254/en/login');
  expect(loginPage?.headers()['cache-control']).toContain('no-store');
  const refreshedCookies = (await context.cookies()).filter(cookie=>cookie.name.startsWith('lumiq-website-auth')).sort((a,b)=>a.name.localeCompare(b.name)).map(cookie=>cookie.value).join('');
  const refreshedSession = JSON.parse(Buffer.from(refreshedCookies.slice(7),'base64url').toString('utf8'));
  expect(refreshedSession.refresh_token).not.toBe(previousRefresh);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.getByText('You have signed out.',{exact:true})).toBeVisible();
  expect((await context.cookies()).filter(cookie=>cookie.name.startsWith('lumiq-website-auth'))).toHaveLength(0);
  await backend.from('profiles').update({access_state:'suspended'}).eq('user_id',memberId);
  const denied = await context.request.post('http://127.0.0.1:4254/api/auth/signin',{headers:{origin:'http://127.0.0.1:4254','x-real-ip':ipAddress(16)},data:{email:memberEmail,password,locale:'ja'}});
  expect(denied.status()).toBe(403);
  await backend.from('profiles').update({access_state:'active'}).eq('user_id',memberId);
  const callback = await context.request.get('http://127.0.0.1:4254/auth/callback?locale=ja&next=https://evil.example',{maxRedirects:0});
  expect(callback.status()).toBe(307);
  expect(callback.headers().location).toBe('http://127.0.0.1:4254/ja/login?error=expired');
  const language = await context.request.get('http://127.0.0.1:4254/',{maxRedirects:0});
  expect(new URL(language.headers().location).pathname).toBe('/en');
  expect(['127.0.0.1','localhost']).toContain(new URL(language.headers().location).hostname);
});

test('ssr_refreshes_and_persists_real_auth_cookies_then_rejects_expired_refresh',async({context,page})=> {
  expect((await login(context,staffEmail,ipAddress(17))).status()).toBe(200);
  const originalRefresh = await expireCookie(context,'lumiq-admin-auth',false);
  expect((await context.request.get('/api/session')).status()).toBe(200);
  const refreshed = (await context.cookies()).filter(cookie=>cookie.name.startsWith('lumiq-admin-auth')).sort((a,b)=>a.name.localeCompare(b.name)).map(cookie=>cookie.value).join('');
  const session = JSON.parse(Buffer.from(refreshed.slice(7),'base64url').toString('utf8'));
  expect(session.expires_at).toBeGreaterThan(Math.floor(Date.now()/1000));
  expect(session.refresh_token).not.toBe(originalRefresh);
  await expireCookie(context,'lumiq-admin-auth',true);
  expect((await context.request.get('/api/session')).status()).toBe(401);
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('登录已过期');
});

test('permission-response counterexample rejects an injected success',async({page})=>{
 await page.goto('/login');
 if(process.env.LUMIQ_REGRESSION_FAULT==='unauthorized-success') await page.route('**/api/session',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,data:{role:'admin'}})}));
 const status=await page.evaluate(async()=> (await fetch('/api/session',{cache:'no-store'})).status);
 expect(status).toBe(401);
});
