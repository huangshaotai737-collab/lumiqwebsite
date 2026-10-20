import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { refreshSession } from './lib/auth/refresh';
const localize = createMiddleware(routing);
export default async function middleware(incoming: NextRequest) {
  if(incoming.nextUrl.pathname === '/_next/image') {
    // The public optimizer must never fetch authenticated draft bytes, even with staff cookies.
    let image = incoming.nextUrl.searchParams.get('url') || '';
    for(let i=0;i<4;i++){try { const decoded=decodeURIComponent(image);if(decoded===image)break;image=decoded; }catch{break;}}
    if(image.includes('/api/content/preview-media/')) return new NextResponse(null,{status:400,headers:{'Cache-Control':'private, no-store'}});
    return NextResponse.next();
  }
  const headers = new Headers(incoming.headers);
  headers.delete('x-lumiq-preview-draft'); headers.delete('x-lumiq-preview-path');
  const preview = /^\/(en|zh-hant|ja)\/preview\/([0-9a-f-]+)$/.exec(incoming.nextUrl.pathname);
  if (preview) {
    headers.set('x-lumiq-preview-draft',preview[2]);
    headers.set('x-lumiq-preview-path',incoming.nextUrl.pathname + incoming.nextUrl.search);
  }
  const request = new NextRequest(incoming,{headers});
  const response = preview || /^\/(en|zh-hant|ja)\/(members|checkout|login|register|reset-password)(\/|$)/.test(request.nextUrl.pathname)
    ? await refreshSession(request,localize) : localize(request);
  if(preview) { response.headers.set('Cache-Control','private, no-store, max-age=0'); response.headers.set('X-Robots-Tag','noindex, nofollow'); }
  return response;
}
// Root Auth callbacks must reach their route handler rather than next-intl.
export const config = { matcher: ['/_next/image', '/((?!api|auth(?:/|$)|_next|_vercel|.*\\..*).*)'] };
