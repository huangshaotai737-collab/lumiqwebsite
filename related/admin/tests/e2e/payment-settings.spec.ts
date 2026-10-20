import { createHmac } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { setup, cleanup, users, password, sql } from '../support/order-fixtures';
const origin = 'http://127.0.0.1:4250';
test.beforeAll(setup);
test.afterAll(async () => {
    try {
        await cleanup();
    }
    finally {
        if (limitSubjects.length)
            sql(`delete from private.request_limits where subject_hash in(${limitSubjects.map(subject => "'" + createHmac('sha256', 'lumiq-synthetic-auth-e2e-shared-salt-20261020').update(subject).digest('hex') + "'").join(',')})`);
    }
});
const limitSubjects: string[] = [];
async function login(page: Page, role: string) {
    await page.context().clearCookies();
    const ip = `2001:db8:${crypto.randomUUID().slice(0, 4)}::7`;
    limitSubjects.push(ip);
    await page.context().setExtraHTTPHeaders({ 'x-real-ip': ip });
    expect((await page.request.post('/api/auth/signin', { headers: { origin }, data: { email: users[role].email, password } })).status()).toBe(200);
}
test('administrator reads disabled payment preparation entry while other staff stay denied', async ({ page }) => {
    for (const role of ['editor', 'operations']) {
        await login(page, role);
        await page.goto('/settings');
        await expect(page.locator('p[role=alert]')).toContainText('系统设置仅管理员可查看');
        await expect(page.getByRole('heading', { name: '支付接入准备' })).toHaveCount(0);
    }
    await login(page, 'admin');
    await page.goto('/settings');
    await expect(page.getByText('支付渠道尚未开通，本次不创建真实交易。')).toBeVisible();
    await page.getByRole('link', { name: '查看接入材料与准备顺序' }).click();
    await expect(page).toHaveURL(/#payment-preparation-checklist$/);
    await expect(page.locator('#payment-preparation-checklist ol li')).toHaveCount(5);
    await expect(page.locator('#payment-preparation-checklist')).toContainText('自动续费和付费订阅不在已实现范围');
    for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.screenshot({ path: `test-results/payment-settings-${width}.png`, fullPage: true });
    }
});
