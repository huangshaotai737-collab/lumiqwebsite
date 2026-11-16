/** Cross-site staff previews require HTTPS and an explicit deployment opt-in. */
export function websiteCookieOptions(secure: boolean) {
  return {
    name: 'lumiq-website-auth',
    path: '/',
    secure,
    sameSite: secure && process.env.NEXT_PUBLIC_EMBEDDED_STAFF_PREVIEW === '1'
      ? 'none' as const : 'lax' as const,
  };
}
