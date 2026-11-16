import 'server-only';
import type { ApiResult, UUID } from '@/lib/generated/platform/core';
export type PaymentResult = {
    reference: string;
    status: string;
};
export type CheckoutInput = {
    orderId: UUID;
    idempotencyKey: string;
};
declare const verifiedPaymentEvent: unique symbol;
/** Compile-time provenance only. A future real provider verifier must validate at runtime. */
export type VerifiedPaymentEvent = {
    eventId: string;
    transactionId: string;
    orderId: UUID;
    amountMinor: number;
    currency: string;
    readonly [verifiedPaymentEvent]: true;
};
export interface PaymentGateway {
    createCheckout(input: CheckoutInput): Promise<ApiResult<PaymentResult>>;
    queryTransaction(input: {
        attemptId: UUID;
    }): Promise<ApiResult<PaymentResult>>;
    handleVerifiedEvent(input: VerifiedPaymentEvent): Promise<ApiResult<PaymentResult>>;
    requestRefund(input: CheckoutInput & {
        amountMinor: number;
    }): Promise<ApiResult<PaymentResult>>;
    queryRefund(input: {
        refundId: UUID;
    }): Promise<ApiResult<PaymentResult>>;
}
