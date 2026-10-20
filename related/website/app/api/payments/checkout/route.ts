import { requireVerifiedUser } from '@/lib/auth/require-user';
import { createPaymentCheckout } from '@/lib/payments/service';
import { orderResponse } from '@/features/orders/http';
import { assertSameOrigin } from '@/lib/http/origin';
import { failure, HttpError } from '@/lib/http/result';
export async function POST(request: Request) {
    try {
        assertSameOrigin(request, process.env.APP_ORIGIN || '');
        await requireVerifiedUser();
        let input: unknown;
        try {
            input = await request.json();
        }
        catch {
            throw new HttpError('INVALID_INPUT', 400);
        }
        return orderResponse(await createPaymentCheckout(input));
    }
    catch (error) {
        return failure(error);
    }
}
