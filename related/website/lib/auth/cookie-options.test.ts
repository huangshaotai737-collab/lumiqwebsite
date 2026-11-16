import {afterEach, expect, it, vi} from 'vitest';
import {websiteCookieOptions} from './cookie-options';

afterEach(() => vi.unstubAllEnvs());

it('keeps ordinary and local sessions same-site unless secure embedding is enabled', () => {
  vi.stubEnv('NEXT_PUBLIC_EMBEDDED_STAFF_PREVIEW', '');
  expect(websiteCookieOptions(true).sameSite).toBe('lax');
  vi.stubEnv('NEXT_PUBLIC_EMBEDDED_STAFF_PREVIEW', '1');
  expect(websiteCookieOptions(false)).toMatchObject({sameSite:'lax', secure:false});
  expect(websiteCookieOptions(true)).toMatchObject({name:'lumiq-website-auth', sameSite:'none', secure:true, path:'/'});
});
