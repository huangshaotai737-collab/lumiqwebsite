import { afterEach, describe, expect, it, vi } from 'vitest';
import { POST as signIn } from '@/app/api/auth/signin/route';
import { GET as callback } from '@/app/auth/callback/route';

// Only external Auth/request context and the unrelated DB limiter are replaced.
// The handlers, input parsing, shared return policy and Next redirect response are real.
vi.mock('@/lib/auth/server', () => ({
  createClient: async () => ({ auth: {
    signInWithPassword: async () => ({ error: null }),
    exchangeCodeForSession: async () => ({ error: null }),
  } }),
}));
vi.mock('@/lib/auth/require-staff', () => ({ requireStaff: async () => ({ userId: 'verified-staff', role: 'admin' }) }));
vi.mock('@/lib/http/rate-limit', () => ({ clientAddress: () => 'unattributed', enforceRateLimit: async () => {} }));
afterEach(() => vi.unstubAllEnvs());

const origin = 'https://admin.example';
describe.each([
  '/safe/..//evil.example',
  '/safe/%2e%2e//evil.example',
  '/safe/.%2e//evil.example',
  '/safe/%2E.//evil.example',
])('normalized redirect safety: %s', (next) => {
  it('signin returns a destination on the configured origin', async () => {
    vi.stubEnv('APP_ORIGIN', origin);
    const response = await signIn(new Request(`${origin}/api/auth/signin`, {
      method: 'POST', headers: { origin, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'staff@example.test', password: 'synthetic-password', next }),
    }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(new URL(result.data.next, origin).origin).toBe(origin);
    expect(result.data.next).toBe('/');
  });
  it('successful callback redirects only to the configured origin', async () => {
    vi.stubEnv('APP_ORIGIN', origin);
    const url = new URL('/auth/callback', origin);
    url.searchParams.set('code', 'synthetic-success-code');
    url.searchParams.set('next', next);
    const response = await callback(new Request(url));
    expect(response.status).toBe(307);
    const destination = new URL(response.headers.get('location')!);
    expect(destination.origin).toBe(origin);
    expect(destination.pathname).toBe('/');
  });
});

it('preserves a safe normalized return with query and hash', async () => {
  vi.stubEnv('APP_ORIGIN', origin);
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('code', 'synthetic-success-code');
  url.searchParams.set('next', '/safe/../team?view=active#members');
  const response = await callback(new Request(url));
  expect(response.headers.get('location')).toBe(`${origin}/team?view=active#members`);
});
