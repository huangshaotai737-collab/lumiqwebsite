import { createHmac } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { setup, cleanup, configure, customer, users, password, address, sql } from '../support/order-fixtures';
const origin = 'http://127.0.0.1:4211';
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
async function login(page: Page, role = 'a') {
    await page.context().clearCookies();
    const ip = `2001:db8:${crypto.randomUUID().slice(0, 4)}::5`;
    limitSubjects.push(ip, users[role].id);
    await page.context().setExtraHTTPHeaders({ 'x-real-ip': ip });
    const response = await page.request.post('/api/auth/signin', { headers: { origin }, data: { email: users[role].email, password, locale: 'en', next: '/en/checkout' } });
    expect(response.status()).toBe(200);
}
test('real own-order HTTP gate and browser_success_cannot_pay_order', async ({ page }) => {
    const catalog = await configure();
    const client = await customer();
    const created = await client.rpc('create_customer_order', { request: { idempotencyKey: 'c5-browser-' + crypto.randomUUID(), items: [{ skuId: catalog.offerings[0].skuId, quantity: 1 }], shippingAddress: address, termsVersion: catalog.terms.releaseId } });
    expect(created.error).toBeNull();
    const orderId = created.data.order.id;
    const data = { orderId, idempotencyKey: 'c5-checkout-' + crypto.randomUUID() };
    const endpoint = '/api/payments/checkout';
    const post = (body: unknown = data, requestOrigin = origin) => page.request.post(endpoint, { headers: { origin: requestOrigin }, data: body });
    expect((await post()).status()).toBe(401);
    await login(page);
    sql(`update auth.users set email_confirmed_at=null where id='${users.a.id}'`);
    try {
        expect((await post()).status()).toBe(403);
    }
    finally {
        sql(`update auth.users set email_confirmed_at=now() where id='${users.a.id}'`);
    }
    await login(page, 'b');
    expect((await post()).status()).toBe(404);
    await login(page);
    const before = await (await page.request.get(`/api/orders/${orderId}`)).json();
    expect(before.data.paymentStatus).toBe('not_configured');
    const disabled = await post();
    expect(disabled.status()).toBe(503);
    expect(await disabled.json()).toMatchObject({ ok: false, error: 'PAYMENTS_NOT_CONFIGURED' });
    expect(disabled.headers()['cache-control']).toContain('no-store');
    expect((await post(data, 'https://untrusted.invalid')).status()).toBe(403);
    for (const extra of [{ amountMinor: 1 }, { paymentStatus: 'paid' }, { userId: users.b.id }, { provider: 'synthetic' }])
        expect((await post({ ...data, ...extra })).status()).toBe(400);
    expect((await post({ ...data, orderId: crypto.randomUUID() })).status()).toBe(404);
    // Existing order view accepts navigation; query strings convey no payment authority.
    await page.goto(`/en/members/orders/${orderId}?success=true&status=paid&transactionId=forged`);
    await expect(page.getByText('Waiting for payment setup', { exact: true })).toBeVisible();
    for (const path of ['/api/payments/webhook', '/api/payments/notify', '/api/payments/success']) {
        const response = await page.request.post(path, { data: { eventId: 'forged', transactionId: 'forged', orderId, amountMinor: 123, currency: 'USD', status: 'paid' } });
        expect(response.status()).toBe(404);
    }
    const success = await page.goto(`/en/checkout/success?orderId=${orderId}&status=paid`);
    expect(success?.status()).toBe(404);
    const after = await (await page.request.get(`/api/orders/${orderId}`)).json();
    expect(after.data).toEqual(before.data);
    for (const table of ['payment_attempts', 'payment_events', 'payment_refunds'])
        expect(sql(`select count(*) from public.${table} where order_id='${orderId}'`)).toBe('0');
    // Shared limiter is real database state, not mocked. Pre-consume the caller bucket.
    for (let i = 0; i < 65; i++) {
        const limited = await post();
        if (limited.status() === 429)
            return;
        expect(limited.status()).toBe(503);
    }
    throw new Error('expected real write rate limit');
});
