// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
import type { StaffRole, UUID, PlatformError } from './core';

export class HttpError extends Error {
  constructor(public readonly code: PlatformError, public readonly status: number, public readonly retryAfterSeconds?: number) { super(code); }
}

export function authorizeUser(userId: UUID | null, profile: { access_state: string } | null): { userId: UUID } {
  if (!userId) throw new HttpError('UNAUTHENTICATED', 401);
  if (profile?.access_state !== 'active') throw new HttpError('FORBIDDEN', 403);
  return { userId };
}

export function authorizeStaff(userId: UUID | null, profile: { access_state: string } | null, membership: { role: string; active: boolean } | null, allowed: readonly StaffRole[]): { userId: UUID; role: StaffRole } {
  authorizeUser(userId, profile);
  if (!membership?.active || !allowed.includes(membership.role as StaffRole)) throw new HttpError('FORBIDDEN', 403);
  return { userId: userId!, role: membership.role as StaffRole };
}

// Decode before checking so encoded slashes, backslashes, controls cannot become an open redirect.
export function safeReturnPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || value.length > 2048) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\\x00-\x20\x7f]/.test(decoded)) return fallback;
    const base = 'https://return.invalid';
    const url = new URL(value, base);
    // Literal/encoded dot segments can normalize a local input into //host.
    // Recheck the final path before it is reused as a relative redirect URL.
    const normalizedPath = decodeURIComponent(url.pathname);
    if (url.origin !== base || !normalizedPath.startsWith('/') || normalizedPath.startsWith('//')) return fallback;
    return url.pathname + url.search + url.hash;
  } catch { return fallback; }
}

export function assertSameOrigin(request: Request, configuredOrigin: string): void {
  let expected: URL;
  try { expected = new URL(configuredOrigin); } catch { throw new HttpError('UNAVAILABLE', 503); }
  if (!['http:', 'https:'].includes(expected.protocol) || expected.origin !== configuredOrigin) throw new HttpError('UNAVAILABLE', 503);
  if (request.headers.get('origin') !== expected.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new HttpError('FORBIDDEN', 403);
}
