import { createClient } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/http/origin';
import { clientAddress, enforceRateLimit } from '@/lib/http/rate-limit';
import { failure, success, HttpError, readJson } from '@/lib/http/result';
import { safeReturnPath } from '@/lib/generated/platform/auth-policy';
import { requireStaff } from '@/lib/auth/require-staff';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request,process.env.APP_ORIGIN || '');
    await enforceRateLimit('signin',clientAddress(request));
    const input = await readJson(request);
    if (!input || typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || typeof input.password !== 'string' || !input.password || input.password.length > 1024) throw new HttpError('INVALID_INPUT',400);
    const client = await createClient();
    const {error} = await client.auth.signInWithPassword({email:input.email,password:input.password});
    if (error && ((error.status || 0) >= 500 || error.name === 'AuthRetryableFetchError')) throw new HttpError('UNAVAILABLE',503);
    if (error) throw new HttpError(error.status === 429 ? 'RATE_LIMITED' : 'UNAUTHENTICATED',error.status === 429 ? 429 : 401);
    try {
      await requireStaff(['admin','editor','operations']);
    } catch (error) { await client.auth.signOut({scope:'local'}); throw error; }
    return success({next:safeReturnPath(input.next,'/')});
  } catch (error) { return failure(error); }
}
