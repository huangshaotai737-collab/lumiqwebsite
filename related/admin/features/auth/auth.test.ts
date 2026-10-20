import { afterEach, describe, expect, it, vi } from 'vitest';
import { authorizeStaff, authorizeUser, safeReturnPath } from '@/lib/generated/platform/auth-policy';
import { assertSameOrigin } from '@/lib/http/origin';

import { clientAddress, consumeRateLimit } from '@/lib/http/rate-limit';
vi.mock('server-only',()=>({}));
afterEach(()=>vi.unstubAllEnvs());

const profile = { access_state: 'active' };
describe('current database authorization', () => {
  it('requires a verified identity', () => expect(() => authorizeStaff(null, profile, {role:'admin',active:true}, ['admin'])).toThrow('UNAUTHENTICATED'));
  it('denies members and inactive staff', () => {
    expect(() => authorizeStaff('user', profile, null, ['admin'])).toThrow('FORBIDDEN');
    expect(() => authorizeStaff('user', profile, {role:'admin',active:false}, ['admin'])).toThrow('FORBIDDEN');
  });
  it('checks allowed roles and suspended profiles', () => {
    expect(() => authorizeStaff('user', profile, {role:'editor',active:true}, ['admin'])).toThrow('FORBIDDEN');
    expect(() => authorizeStaff('user', {access_state:'suspended'}, {role:'admin',active:true}, ['admin'])).toThrow('FORBIDDEN');
    expect(() => authorizeUser('user', {access_state:'anonymized'})).toThrow('FORBIDDEN');
  });
  it('accepts current staff rows', () => expect(authorizeStaff('user', profile, {role:'editor',active:true}, ['editor'])).toEqual({userId:'user',role:'editor'}));
});
it('reject_external_auth_redirect', () => {
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '/%2f%2fevil.example', '/%5cevil.example', '/%0aevil', 'https:evil.example']) expect(safeReturnPath(value, '/en/members')).toBe('/en/members');
  expect(safeReturnPath('/ja/members?view=orders', '/en/members')).toBe('/ja/members?view=orders');
});
it('rejects cross-origin and missing origin cookie writes', () => {
  for (const origin of ['https://evil.example', 'null', '']) expect(() => assertSameOrigin(new Request('https://admin.example/api', {method:'POST',headers:{origin}}), 'https://admin.example')).toThrow('FORBIDDEN');
  expect(() => assertSameOrigin(new Request('https://admin.example/api', {method:'POST',headers:{origin:'https://admin.example'}}), 'https://admin.example')).not.toThrow();
  expect(() => assertSameOrigin(new Request('https://admin.example/api', {method:'POST',headers:{origin:'https://admin.example','sec-fetch-site':'cross-site'}}), 'https://admin.example')).toThrow('FORBIDDEN');
});

it('ignores untrusted forwarded addresses and accepts only fixed ingress configuration', () => {
  vi.stubEnv('REQUEST_IP_HEADER','');
  const request = new Request('https://admin.example',{headers:{'x-forwarded-for':'203.0.113.1','x-real-ip':'203.0.113.2'}});
  expect(clientAddress(request)).toBe('unattributed');
  vi.stubEnv('REQUEST_IP_HEADER','x-forwarded-for');
  expect(()=>clientAddress(request)).toThrow('UNAVAILABLE');
  vi.stubEnv('REQUEST_IP_HEADER','x-real-ip');
  expect(clientAddress(request)).toBe('203.0.113.2');
  expect(()=>clientAddress(new Request('https://admin.example',{headers:{'x-real-ip':'203.0.113.2, 203.0.113.3'}}))).toThrow('UNAVAILABLE');
});
it('closes writes when the shared digest salt is missing or too short', async () => {
  for(const salt of ['', 'short']) {
    vi.stubEnv('REQUEST_LIMIT_SALT',salt);
    await expect(consumeRateLimit('signin','203.0.113.1')).rejects.toMatchObject({code:'UNAVAILABLE',status:503});
  }
});
