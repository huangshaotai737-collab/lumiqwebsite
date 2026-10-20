import { acceptStaffInvite, responseFor } from '@/features/team/service';
import { createClient } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/http/origin';
import { clientAddress, enforceRateLimit } from '@/lib/http/rate-limit';
import { failure, success, HttpError } from '@/lib/http/result';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    let input;
    try {
      input = await request.json();
    } catch {
      throw new HttpError('INVALID_INPUT', 400);
    }
    if (input?.action === 'signin') {
      await enforceRateLimit('signin', clientAddress(request));
      if (
        typeof input.email !== 'string' ||
        input.email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) ||
        typeof input.password !== 'string' ||
        !input.password ||
        input.password.length > 1024
      )
        throw new HttpError('INVALID_INPUT', 400);
      const client = await createClient();
      const response = await client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (response.error)
        throw new HttpError(
          response.error.status === 429
            ? 'RATE_LIMITED'
            : (response.error.status || 0) >= 500
              ? 'UNAVAILABLE'
              : 'UNAUTHENTICATED',
          response.error.status === 429
            ? 429
            : (response.error.status || 0) >= 500
              ? 503
              : 401,
        );
      const verified = await client.auth.getUser();
      if (
        verified.error ||
        !verified.data.user ||
        verified.data.user.is_anonymous ||
        !verified.data.user.email_confirmed_at
      ) {
        await client.auth.signOut({ scope: 'local' });
        throw new HttpError('FORBIDDEN', 403);
      }
      // This only establishes a member session. Acceptance is always explicit and independent.
      return success(null);
    }
    return responseFor(await acceptStaffInvite(input));
  } catch (error) {
    return failure(error);
  }
}
