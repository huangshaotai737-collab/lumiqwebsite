import {getOwnProfile, updateOwnProfile} from '@/features/account/service';
import {assertSameOrigin} from '@/lib/http/origin';
import {clientAddress, enforceRateLimit} from '@/lib/http/rate-limit';
import {failure, HttpError} from '@/lib/http/result';
import type {ApiResult, Profile} from '@/lib/generated/platform/core';

function response(result: ApiResult<Profile>) {
  return Response.json(result, {
    status:result.ok ? 200 : ({UNAUTHENTICATED:401, FORBIDDEN:403, INVALID_INPUT:400} as Record<string, number>)[result.error] || 503,
    headers:{'Cache-Control':'private, no-store, max-age=0'},
  });
}
export async function GET() {
  return response(await getOwnProfile());
}
export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    await enforceRateLimit('write', clientAddress(request));
    let input;
    try {
      input = await request.json();
    } catch {
      throw new HttpError('INVALID_INPUT', 400);
    }
    return response(await updateOwnProfile(input));
  } catch (error) {
    return failure(error);
  }
}
