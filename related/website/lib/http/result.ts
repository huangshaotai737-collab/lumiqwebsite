import type { PlatformError } from '../generated/platform/core';
import { HttpError } from '../generated/platform/auth-policy';
export { HttpError };
export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError('INVALID_INPUT', 400);
  }
}
export function success<T>(data: T) { return Response.json({ ok: true, data }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } }); }
export function failure(error: unknown) {
  const fault = error instanceof HttpError ? error : new HttpError('UNAVAILABLE', 503);
  const headers: Record<string,string> = { 'Cache-Control': 'private, no-store, max-age=0' };
  if (fault.retryAfterSeconds) headers['Retry-After'] = String(fault.retryAfterSeconds);
  return Response.json({ ok: false, error: fault.code as PlatformError, requestId: crypto.randomUUID() }, { status: fault.status, headers });
}
