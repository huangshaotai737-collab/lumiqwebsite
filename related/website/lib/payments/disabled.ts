import 'server-only';
import type { ApiResult } from '@/lib/generated/platform/core';
import type { PaymentGateway, PaymentResult } from './types';
async function disabled(): Promise<ApiResult<PaymentResult>> {
    return { ok: false, error: 'PAYMENTS_NOT_CONFIGURED', requestId: crypto.randomUUID() };
}
/** Fixed adapter. Environment variables cannot activate collection. No side effects. */
export const disabledGateway: PaymentGateway = Object.freeze({
    createCheckout: disabled,
    queryTransaction: disabled,
    handleVerifiedEvent: disabled,
    requestRefund: disabled,
    queryRefund: disabled,
});
