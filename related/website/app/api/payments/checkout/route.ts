import { requireVerifiedUser } from '@/lib/auth/require-user';
import { createPaymentCheckout } from '@/lib/payments/service';
import { orderResponse } from '@/features/orders/http';
import { assertSameOrigin } from '@/lib/http/origin';
import { failure, readJson } from '@/lib/http/result';
export async function POST(request: Request) {
    try {
        assertSameOrigin(request, process.env.APP_ORIGIN || '');
        await requireVerifiedUser();
        const input: unknown = await readJson(request);
        return orderResponse(await createPaymentCheckout(input));
    }
    catch (error) {
        return failure(error);
    }
}
