import { NextResponse } from 'next/server';
import { createClient } from '@/lib/auth/server';
import { safeReturnPath } from '@/lib/generated/platform/auth-policy';
import { failure, HttpError } from '@/lib/http/result';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fallback = '/';
  const login = '/login';
  const origin = process.env.APP_ORIGIN;
  if (!origin) return failure(new HttpError('UNAVAILABLE',503));
  const next = safeReturnPath(url.searchParams.get('next'),fallback);
  const code = url.searchParams.get('code');
  if (code) {
    try {
      const client = await createClient();
      const {error} = await client.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(new URL(next,origin));
        response.headers.set('Cache-Control','private, no-store, max-age=0');
        return response;
      }
    } catch { /* Redirect with visible safe error; never reflect Auth code/token in the URL. */ }
  }
  const response = NextResponse.redirect(new URL(`${login}?error=expired`,origin));
  response.headers.set('Cache-Control','private, no-store, max-age=0');
  return response;
}
