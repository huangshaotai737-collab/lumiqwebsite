import createMiddleware from 'next-intl/middleware';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { refreshSession } from './lib/auth/refresh';
const localize = createMiddleware(routing);
export default async function middleware(request: NextRequest) {
  if (/^\/(en|zh-hant|ja)\/(members|login)(\/|$)/.test(request.nextUrl.pathname)) return refreshSession(request,localize);
  return localize(request);
}
// Root Auth callbacks must reach their route handler rather than next-intl.
export const config = { matcher: ['/((?!api|auth(?:/|$)|_next|_vercel|.*\\..*).*)'] };
