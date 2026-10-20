import { createClient } from './server';
import { authorizeUser } from '../generated/platform/auth-policy';
import type { UUID } from '../generated/platform/core';
import { HttpError } from '../http/result';
export async function requireUser(): Promise<{userId: UUID; emailVerified: boolean}> {
  const client = await createClient();
  const {data:{user},error} = await client.auth.getUser();
  if (error && ((error.status || 0) >= 500 || error.name === 'AuthRetryableFetchError')) throw new HttpError('UNAVAILABLE',503);
  if (error || !user || user.is_anonymous) throw new HttpError('UNAUTHENTICATED',401);
  const {data:profile,error:profileError} = await client.from('profiles').select('access_state').eq('user_id',user.id).maybeSingle();
  if (profileError) throw new HttpError('UNAVAILABLE',503);
  return {...authorizeUser(user.id,profile),emailVerified:Boolean(user.email_confirmed_at)};
}
