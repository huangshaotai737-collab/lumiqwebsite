import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({ user: null as null | {
        id: string;
        email_confirmed_at: string;
    }, rpc: vi.fn(), limit: vi.fn() }));
vi.mock('@/lib/auth/server', () => ({ createClient: async () => ({
        auth: { getUser: async () => ({ data: { user: state.user }, error: null }) },
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { access_state: 'active' }, error: null }) }) }) }), rpc: state.rpc,
    }) }));
vi.mock('@/lib/http/rate-limit', () => ({ enforceRateLimit: state.limit }));
import { disabledGateway } from '@/lib/payments/disabled';
import type { VerifiedPaymentEvent } from '@/lib/payments/types';
import { POST } from '@/app/api/payments/checkout/route';
import { HttpError } from '@/lib/http/result';
const orderId = 'c5000000-0000-4000-8000-000000000001';
const input = { orderId, idempotencyKey: 'payment-test-key' };
function request(body: unknown = input, origin = 'http://127.0.0.1:4211') { return new Request(origin + '/api/payments/checkout', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }); }
beforeEach(() => { process.env.APP_ORIGIN = 'http://127.0.0.1:4211'; state.user = { id: orderId, email_confirmed_at: '2026-10-20' }; state.rpc.mockReset().mockResolvedValue({ data: { id: orderId, paymentStatus: 'not_configured' }, error: null }); state.limit.mockReset(); });
it('payment_is_disabled for all five interfaces', async () => {
    const event = { eventId: 'raw', transactionId: 'raw', orderId, amountMinor: 123, currency: 'USD' };
    // @ts-expect-error Raw notification JSON does not carry verifier provenance.
    const unverified: VerifiedPaymentEvent = event;
    void unverified;
    const calls = [disabledGateway.createCheckout(input), disabledGateway.queryTransaction({ attemptId: orderId }), disabledGateway.handleVerifiedEvent(event as VerifiedPaymentEvent), disabledGateway.requestRefund({ ...input, amountMinor: 123 }), disabledGateway.queryRefund({ refundId: orderId })];
    for (const result of await Promise.all(calls))
        expect(result).toMatchObject({ ok: false, error: 'PAYMENTS_NOT_CONFIGURED' });
    expect(state.rpc).not.toHaveBeenCalled();
});
it('checkout requires actual verified auth before disabled response', async () => {
    state.user = null;
    expect((await POST(request())).status).toBe(401);
    expect(state.rpc).not.toHaveBeenCalled();
    state.user = { id: orderId, email_confirmed_at: '' };
    expect((await POST(request())).status).toBe(403);
    expect(state.rpc).not.toHaveBeenCalled();
});
it('checkout verifies own order and rate limit then returns no-store 503', async () => {
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: 'PAYMENTS_NOT_CONFIGURED' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(state.limit).toHaveBeenCalledWith('write', orderId);
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith('get_customer_order', { order_id: orderId });
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0002' } });
    expect((await POST(request())).status).toBe(404);
    state.limit.mockRejectedValueOnce(new HttpError('RATE_LIMITED', 429));
    expect((await POST(request())).status).toBe(429);
});
it('checkout rejects foreign Origin, malformed JSON and extra payment fields', async () => {
    expect((await POST(request(input, 'https://other.invalid'))).status).toBe(403);
    for (const body of [null, [], {}, { ...input, status: 'paid' }, { ...input, amountMinor: 1 }, { ...input, idempotencyKey: 'short' }, { ...input, orderId: 'invalid' }])
        expect((await POST(request(body))).status).toBe(400);
    expect((await POST(new Request('http://127.0.0.1:4211/api/payments/checkout', { method: 'POST', headers: { origin: 'http://127.0.0.1:4211' }, body: '{' }))).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
});
