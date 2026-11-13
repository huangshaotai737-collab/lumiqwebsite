import { createClient } from '@/lib/auth/server';
import { assertSameOrigin } from '@/lib/http/origin';
import { enforceRateLimit } from '@/lib/http/rate-limit';
import { failure, success, HttpError } from '@/lib/http/result';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request,process.env.APP_ORIGIN || '');
    const client = await createClient();
    const {data:{user},error:identityError} = await client.auth.getUser();
    if (identityError && ((identityError.status || 0) >= 500 || identityError.name === 'AuthRetryableFetchError')) throw new HttpError('UNAVAILABLE',503);
    if (identityError || !user) throw new HttpError('UNAUTHENTICATED',401);
    await enforceRateLimit('write',user.id);
    const {error} = await client.auth.signOut({scope:'local'});
    if (error) throw new HttpError('UNAVAILABLE',503);
    return success(null);
  } catch (error) { return failure(error); }
}
