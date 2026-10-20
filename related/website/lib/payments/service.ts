import 'server-only';
import { requireVerifiedUser } from '@/lib/auth/require-user';
import { enforceRateLimit } from '@/lib/http/rate-limit';
import { HttpError } from '@/lib/http/result';
import { getOwnOrder } from '@/features/orders/service';
import { validUUID } from '@/features/orders/schema';
import type { ApiResult } from '@/lib/generated/platform/core';
import { disabledGateway } from './disabled';
import type { CheckoutInput, PaymentResult } from './types';
function checkoutInput(value: unknown): CheckoutInput {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).length !== 2 ||
        Object.keys(value).some(key => !['orderId', 'idempotencyKey'].includes(key)))
        throw new HttpError('INVALID_INPUT', 400);
    const input = value as Record<string, unknown>;
    validUUID(input.orderId);
    if (typeof input.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(input.idempotencyKey))
        throw new HttpError('INVALID_INPUT', 400);
    return { orderId: input.orderId.toLowerCase(), idempotencyKey: input.idempotencyKey };
}
/** Customer-session read proves ownership; no service-role business RPC or attempt insert. */
export async function createPaymentCheckout(value: unknown): Promise<ApiResult<PaymentResult>> {
    const { userId } = await requireVerifiedUser();
    const input = checkoutInput(value);
    await enforceRateLimit('write', userId);
    const order = await getOwnOrder(input.orderId);
    if (!order.ok)
        return order;
    return disabledGateway.createCheckout(input);
}
