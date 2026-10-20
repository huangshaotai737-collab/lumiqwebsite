import { expect, test, type BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const local = parseEnv(
  readFileSync(
    process.env.LUMIQ_TEST_ENV_FILE ||
      path.resolve(
        __dirname,
        '../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/a3.env',
      ),
    'utf8',
  ),
);
const backend = createClient(local.API_URL!, local.SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = `Synthetic-${crypto.randomUUID()}!`;
const prefix = `a4-${Date.now()}`;
const users: Record<string, { id: string; email: string }> = {};
const origin = 'http://127.0.0.1:4257';
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  for (const role of ['admin', 'editor', 'operations', 'member', 'other']) {
    const email = `${prefix}-${role}@example.test`;
    const { data, error } = await backend.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error('synthetic account setup failed');
    users[role] = { id: data.user.id, email };
    if (role === 'admin') {
      const env = {
        ...process.env,
        SUPABASE_URL: local.API_URL!,
        SUPABASE_SECRET_KEY: local.SERVICE_ROLE_KEY!,
      };
      const cli = path.resolve(
        __dirname,
        '../../../../scripts/bootstrap-admin.mjs',
      );
      const first = spawnSync(process.execPath, [cli, '--email', email], {
        env,
        encoding: 'utf8',
      });
      expect(first.status).toBe(0);
      expect(first.stdout).toContain('created and audited');
      const duplicate = spawnSync(process.execPath, [cli, '--email', email], {
        env,
        encoding: 'utf8',
      });
      expect(duplicate.status).toBe(1);
      expect(duplicate.stderr).toContain('administrator already exists');
    } else if (['editor', 'operations'].includes(role)) {
      const { error } = await backend
        .from('staff_memberships')
        .insert({ user_id: data.user.id, role, active: true });
      if (error) throw new Error('synthetic role setup failed');
    }
  }
});
test.afterAll(async () => {
  for (const user of Object.values(users))
    await backend.auth.admin.deleteUser(user.id);
});
async function login(context: BrowserContext, role: string, base = origin) {
  await context.setExtraHTTPHeaders({
    'x-real-ip': `2001:db8:${crypto.randomUUID().slice(0, 4)}::2`,
  });
  const response = await context.request.post(`${base}/api/auth/signin`, {
    headers: {
      origin: base,
      'x-real-ip': `2001:db8:${Date.now().toString(16).slice(-4)}::1`,
    },
    data: { email: users[role].email, password },
  });
  expect(response.status()).toBe(200);
}
async function post(
  context: BrowserContext,
  url: string,
  data: unknown,
  base = origin,
) {
  return context.request.post(`${base}${url}`, {
    headers: { origin: base },
    data,
  });
}
async function mailLink(email: string) {
  for (let count = 0; count < 30; count++) {
    const messages = await (
      await fetch('http://127.0.0.1:54324/api/v1/messages')
    ).json();
    const message = messages.messages.find(
      (value: { To: { Address: string }[] }) =>
        value.To.some((item) => item.Address === email),
    );
    if (message) {
      const detail = await (
        await fetch(`http://127.0.0.1:54324/api/v1/message/${message.ID}`)
      ).json();
      return detail.Text.match(
        /http:\/\/127\.0\.0\.1:4257\/invite#[^\s]+/,
      )[0] as string;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('local invitation not delivered');
}
test('editor and operations invitation APIs return 403, missing origin fails closed', async ({
  browser,
}) => {
  for (const role of ['editor', 'operations']) {
    const context = await browser.newContext();
    await login(context, role);
    expect(
      (
        await post(context, '/api/team/invite', {
          email: users.member.email,
          role: 'admin',
        })
      ).status(),
    ).toBe(403);
    const page = await context.newPage();
    await page.goto('/');
    expect(
      await page.getByRole('link', { name: '团队与权限', exact: true }).count(),
    ).toBe(0);
    expect(
      await page.getByRole('link', { name: '操作记录', exact: true }).count(),
    ).toBe(1);
    expect((await context.request.get(`${origin}/api/settings`)).status()).toBe(
      403,
    );
    await context.close();
  }
  const context = await browser.newContext();
  await login(context, 'admin');
  expect(
    (
      await context.request.post(`${origin}/api/team/invite`, {
        data: { email: users.member.email, role: 'editor' },
      })
    ).status(),
  ).toBe(403);
  await context.close();
});
test('invitation email, verified identity, explicit acceptance and single use work in browser', async ({
  page,
  context,
  browser,
}) => {
  await login(context, 'admin');
  await page.goto('/team');
  await page.getByLabel('邀请邮箱').fill(users.member.email);
  await page.getByLabel('邀请角色').selectOption('editor');
  await page.getByRole('button', { name: '发送邀请', exact: true }).click();
  await expect(
    page.getByRole('region', { name: '邀请员工' }).getByRole('status'),
  ).toContainText('邀请已发送');
  const link = await mailLink(users.member.email);
  const invite = new URLSearchParams(new URL(link).hash.slice(1));
  const wrong = await browser.newContext({
    extraHTTPHeaders: {
      'x-real-ip': `2001:db8:${crypto.randomUUID().slice(0, 4)}::4`,
    },
  });
  expect(
    (
      await post(wrong, '/api/team/accept', {
        action: 'signin',
        email: users.other.email,
        password,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await post(wrong, '/api/team/accept', Object.fromEntries(invite))
    ).status(),
  ).toBe(403);
  await wrong.close();
  const before = await backend
    .from('staff_memberships')
    .select('*')
    .eq('user_id', users.member.id);
  expect(before.data).toHaveLength(0);
  const recipient = await browser.newContext({
    extraHTTPHeaders: {
      'x-real-ip': `2001:db8:${crypto.randomUUID().slice(0, 4)}::3`,
    },
  });
  const recipientPage = await recipient.newPage();
  await recipientPage.goto(link);
  await recipientPage.getByLabel('受邀邮箱').fill(users.member.email);
  await recipientPage.getByLabel('密码', { exact: true }).fill(password);
  await recipientPage
    .getByRole('button', { name: '验证账号', exact: true })
    .click();
  await expect(recipientPage.getByRole('status')).toContainText('账号已验证');
  await recipientPage
    .getByRole('button', { name: '接受邀请', exact: true })
    .click();
  await expect(recipientPage.getByRole('status')).toContainText(
    '已获得员工权限',
  );
  expect(
    (
      await post(recipient, '/api/team/accept', Object.fromEntries(invite))
    ).status(),
  ).toBe(409);
  expect((await recipient.request.get(`${origin}/api/session`)).status()).toBe(
    200,
  );
  await recipient.close();
});
test('failed SMTP delivery never grants role; role/status change and safe settings audited', async ({
  page,
  context,
  browser,
}) => {
  await login(context, 'admin');
  await login(context, 'admin', 'http://127.0.0.1:4258');
  const response = await post(
    context,
    '/api/team/invite',
    { email: users.other.email, role: 'admin' },
    'http://127.0.0.1:4258',
  );
  expect(response.status()).toBe(503);
  expect(
    (
      await backend
        .from('staff_memberships')
        .select('*')
        .eq('user_id', users.other.id)
    ).data,
  ).toHaveLength(0);
  await page.goto('/team');
  const row = page.getByRole('row').filter({ hasText: users.member.email });
  await row.getByLabel('员工角色').selectOption('operations');
  await row.getByRole('button', { name: '保存权限' }).click();
  await expect(row.getByRole('status')).toContainText('已保存');
  const affected = await browser.newContext();
  await login(affected, 'member');
  await row.getByLabel('在职').uncheck();
  await row.getByRole('button', { name: '保存权限' }).click();
  await expect(row.getByRole('status')).toContainText('已保存');
  expect((await affected.request.get(`${origin}/api/session`)).status()).toBe(
    403,
  );
  await affected.close();
  await page.goto('/settings');
  await expect(page.getByText('配置状态')).toBeVisible();
  const settings = await context.request.get('/api/settings');
  const body = await settings.json();
  expect(body.ok).toBe(true);
  expect(
    Object.values(body.data.configuration).every(
      (value) => typeof value === 'boolean',
    ),
  ).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(
    /SERVICE_ROLE|SMTP_PASSWORD|token_digest/,
  );
  await page.goto('/audit');
  await expect(page.getByText('team.changed').first()).toBeVisible();
  const evidence = path.resolve(
    __dirname,
    '../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/task-4-evidence',
  );
  mkdirSync(evidence, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/team');
  await page.screenshot({
    path: path.join(evidence, 'team-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/team');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('heading', { name: '员工', exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole('button', { name: '保存权限' }).first(),
  ).toBeInViewport();
  await page.screenshot({
    path: path.join(evidence, 'team-mobile-320.png'),
    fullPage: true,
  });
});
