import {HttpError} from '@/lib/http/result';

export function authInput(input: unknown, password = false) {
  if (!input || typeof input !== 'object') {
    throw new HttpError('INVALID_INPUT', 400);
  }
  const value = input as Record<string, unknown>;
  if (typeof value.email !== 'string' || value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
    throw new HttpError('INVALID_INPUT', 400);
  }
  if (password && (typeof value.password !== 'string' || value.password.length < 8 || value.password.length > 1024)) {
    throw new HttpError('INVALID_INPUT', 400);
  }
  return {
    email:value.email,
    password:value.password as string,
    locale:['en','zh-hant','ja'].includes(value.locale as string) ? value.locale as string : 'en',
    next:value.next,
  };
}

export async function jsonInput(request: Request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError('INVALID_INPUT', 400);
  }
}

export function mailError(
  error: {status?:number; name?:string; code?:string} | null,
  operation: 'register' | 'reset',
) {
  if (!error) return;
  if ((error.status || 0) >= 500 || error.name === 'AuthRetryableFetchError') {
    throw new HttpError('UNAVAILABLE', 503);
  }
  if (error.status === 429 || ['over_request_rate_limit','over_email_send_rate_limit'].includes(error.code || '')) {
    throw new HttpError('RATE_LIMITED', 429);
  }
  // Only account-existence outcomes need the indistinguishable sent-mail response.
  // Unknown/provider-configuration errors must never become a false success.
  const existenceCodes = operation === 'register' ? ['email_exists','user_already_exists'] : ['user_not_found'];
  if (existenceCodes.includes(error.code || '')) return;
  if (['weak_password','email_address_invalid','validation_failed'].includes(error.code || '')) {
    throw new HttpError('INVALID_INPUT', 400);
  }
  throw new HttpError('UNAVAILABLE', 503);
}
