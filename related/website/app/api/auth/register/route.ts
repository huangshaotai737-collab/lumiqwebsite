import { createClient } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/http/origin';
import { clientAddress, enforceRateLimit } from '@/lib/http/rate-limit';
import { failure, success, HttpError } from '@/lib/http/result';
import { safeReturnPath } from '@/lib/generated/platform/auth-policy';
import { authInput, jsonInput, mailError } from '@/features/account/auth-input';
export async function POST(request: Request) {
    try {
        assertSameOrigin(request, process.env.APP_ORIGIN || '');
        await enforceRateLimit('register', clientAddress(request));
        const input = authInput(await jsonInput(request), true), fallback = `/${input.locale}/members`;
        let next = safeReturnPath(input.next, fallback);
        if (!/^\/(en|zh-hant|ja)(\/|$)/.test(next))
            next = fallback;
        const callback = new URL('/auth/callback', process.env.APP_ORIGIN);
        callback.searchParams.set('locale', input.locale);
        callback.searchParams.set('next', next);
        const client = await createClient();
        const { data, error } = await client.auth.signUp({ email: input.email, password: input.password, options: { emailRedirectTo: callback.href } });
        mailError(error);
        // Confirmation must be enabled in Auth. A misconfigured immediate session fails closed.
        if (data.session) {
            await client.auth.signOut({ scope: 'local' });
            throw new HttpError('UNAVAILABLE', 503);
        }
        return success({ sent: true });
    }
    catch (error) {
        return failure(error);
    }
}
