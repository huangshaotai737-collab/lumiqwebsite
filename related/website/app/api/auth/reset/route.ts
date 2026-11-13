import {assertAccountBinding} from '@/features/account/identity-binding';
import {createClient} from '@/lib/auth/server';
import {requireUser} from '@/lib/auth/require-user';
import {assertSameOrigin} from '@/lib/http/origin';
import {clientAddress, enforceRateLimit} from '@/lib/http/rate-limit';
import {failure, success, HttpError} from '@/lib/http/result';
import {authInput, jsonInput, mailError} from '@/features/account/auth-input';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    await enforceRateLimit('reset', clientAddress(request));
    const input = authInput(await jsonInput(request));
    const callback = new URL('/auth/callback', process.env.APP_ORIGIN);
    callback.searchParams.set('locale', input.locale);
    callback.searchParams.set('next', `/${input.locale}/reset-password?mode=update`);
    const client = await createClient();
    const {error} = await client.auth.resetPasswordForEmail(input.email, {redirectTo:callback.href});
    mailError(error, 'reset');
    return success({sent:true});
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    await enforceRateLimit('write', clientAddress(request));
    const identity = await requireUser();
    if (!identity.emailVerified) {
      throw new HttpError('FORBIDDEN', 403);
    }
    const input = await jsonInput(request);
    assertAccountBinding(input, identity.userId);
    if (typeof input?.password !== 'string' || input.password.length < 8 || input.password.length > 1024) {
      throw new HttpError('INVALID_INPUT', 400);
    }
    const client = await createClient();
    const {error} = await client.auth.updateUser({password:input.password});
    if (error) {
      throw new HttpError('INVALID_INPUT', 400);
    }
    await client.auth.signOut({scope:'global'});
    return success({updated:true});
  } catch (error) {
    return failure(error);
  }
}
