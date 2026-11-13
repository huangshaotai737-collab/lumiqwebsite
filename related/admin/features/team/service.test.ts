import { afterEach, expect, it, vi } from 'vitest';
import { validateInvite, validateChange, configurationStatus } from './service';
vi.mock('server-only', () => ({}));
afterEach(() => vi.unstubAllEnvs());
it('normalizes a staff invite and rejects malformed email or unrecognized roles', () => {
  expect(
    validateInvite({ email: ' Person@Example.test ', role: 'editor' }),
  ).toEqual({ email: 'person@example.test', role: 'editor' });
  for (const input of [
    { email: 'broken', role: 'admin' },
    { email: 'a@b.test', role: 'owner' },
    { email: 'a@b.test', role: ['admin'] },
    { email: 'a\nb@c.test', role: 'admin' },
  ])
    expect(() => validateInvite(input)).toThrow('INVALID_INPUT');
});
it('requires exact role, UUID and boolean for staff mutations', () => {
  const input = {
    userId: '10000000-0000-4000-8000-000000000001',
    role: 'operations',
    active: false,
  };
  expect(validateChange(input)).toEqual(input);
  expect(() => validateChange({ ...input, active: 'false' })).toThrow(
    'INVALID_INPUT',
  );
  expect(() => validateChange({ ...input, userId: 'anything' })).toThrow(
    'INVALID_INPUT',
  );
});
it('returns only boolean integration status and never server secret values', () => {
  vi.stubEnv('SUPABASE_SECRET_KEY', 'secret-sentinel');
  vi.stubEnv('SMTP_HOST', 'host-sentinel');
  vi.stubEnv('SMTP_USER', 'user-sentinel');
  vi.stubEnv('SMTP_PASSWORD', 'password-sentinel');
  const status = configurationStatus();
  expect(
    Object.values(status).every((value) => typeof value === 'boolean'),
  ).toBe(true);
  expect(JSON.stringify(status)).not.toMatch(/sentinel/);
  expect(status.payments).toBe(false);
});
it('preserves a retry delay on write-rate rejection', async () => {
  const { responseFor } = await import('./service');
  expect(
    responseFor({
      ok: false,
      error: 'RATE_LIMITED',
      requestId: 'test',
    }).headers.get('retry-after'),
  ).toBe('60');
});
