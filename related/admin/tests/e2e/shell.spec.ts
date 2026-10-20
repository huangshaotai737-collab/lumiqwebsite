import { expect, test } from '@playwright/test';

test('unconfigured_admin_is_closed', async ({ page, request }) => {
  const dataRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/(?:api|rest\/v1)\//.test(request.url())) dataRequests.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '管理后台暂不可用' })).toBeVisible();
  await expect(page.getByText('认证服务尚未配置，管理访问已关闭。')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByTestId('member-data')).toHaveCount(0);
  await expect(page.getByTestId('order-data')).toHaveCount(0);
  for (const route of ['/api/members', '/api/orders']) {
    const response = await request.get(route);
    expect(response.status()).toBe(404);
  }
  expect(dataRequests).toEqual([]);
});

test('login_is_accessible_by_keyboard_and_cannot_submit_without_configuration', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '员工登录' })).toBeVisible();
  await page.getByLabel('工作邮箱').focus();
  await page.keyboard.type('staff@example.test');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('密码', { exact: true })).toBeFocused();
  await page.keyboard.type('keyboard-only-test');
  await expect(page.getByRole('button', { name: '登录', exact: true })).toBeDisabled();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '返回工作台' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: '管理后台暂不可用' })).toBeVisible();
});

test('sidebar_collapses_without_exposing_unimplemented_modules', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: '展开导航' })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: '展开导航' }).click();
  await expect(page.getByRole('button', { name: '折叠导航' })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: '折叠导航' }).click();
  await expect(page.getByRole('button', { name: '展开导航' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: '会员', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '订单', exact: true })).toBeDisabled();
});

test('mobile_shell_has_no_horizontal_overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto('/login');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
