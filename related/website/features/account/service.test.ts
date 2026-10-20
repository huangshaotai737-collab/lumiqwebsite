import {beforeEach, describe, it, expect, vi} from 'vitest';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({
  user: null as null | {id:string; email_confirmed_at:string},
  profile: {user_id:'a', display_name:'A', locale:'en', shipping_address:{}, access_state:'active'},
}));
vi.mock('@/lib/auth/server', () => ({
  createClient: async () => ({
    auth: {getUser: async () => ({data:{user:state.user}, error:null})},
    from: () => ({select: () => ({eq: (_key:string, id:string) => ({
      maybeSingle: async () => ({data:id === state.profile.user_id ? state.profile : null, error:null}),
    })})}),
  }),
}));
import {requireUser, requireVerifiedUser} from '@/lib/auth/require-user';
import {getOwnProfile, validateProfileInput} from './service';

describe('verified customer profile', () => {
  beforeEach(() => {state.user = null;});

  it('local_preview_is_not_an_account', async () => {
    const storage = new Map();
    vi.stubGlobal('localStorage', {
      setItem:(key:string, value:string) => storage.set(key, value),
      getItem:(key:string) => storage.get(key) || null,
    });
    try {
      localStorage.setItem('lumiq-member-preview-v1', JSON.stringify({version:1, demo:true, name:'Forged'}));
      expect(storage.size).toBe(1);
      await expect(requireUser()).rejects.toThrow('UNAUTHENTICATED');
      expect(await getOwnProfile()).toMatchObject({ok:false, error:'UNAUTHENTICATED'});
    } finally {vi.unstubAllGlobals();}
  });

  it('unverified users cannot pass the order identity gate', async () => {
    state.user = {id:'a', email_confirmed_at:''};
    await expect(requireVerifiedUser()).rejects.toThrow('FORBIDDEN');
    state.user.email_confirmed_at = '2026-01-01';
    expect(await requireVerifiedUser()).toMatchObject({userId:'a', emailVerified:true});
  });

  it('returns only safe own profile fields', async () => {
    state.user = {id:'a', email_confirmed_at:'2026-01-01'};
    expect(await getOwnProfile()).toEqual({ok:true, data:{userId:'a', displayName:'A', locale:'en', shippingAddress:null}});
  });

  it('validates length, real ISO country and multiline address', () => {
    const address = {name:'A', country:'JP', region:'Tokyo', city:'Tokyo', postalCode:'100', line1:'One\nTwo', line2:'', phone:''};
    expect(validateProfileInput({displayName:'A', locale:'ja', shippingAddress:address}).shippingAddress?.line1).toBe('One\nTwo');
    const filtered=validateProfileInput({displayName:'A',locale:'ja',shippingAddress:{...address,internalNotes:'private'}});
    expect(filtered.shippingAddress).not.toHaveProperty('internalNotes');
    for (const country of ['ZZ','UK','日本']) {
      expect(() => validateProfileInput({displayName:'A', locale:'ja', shippingAddress:{...address, country}})).toThrow('INVALID_INPUT');
    }
    expect(() => validateProfileInput({displayName:'x'.repeat(121), locale:'en', shippingAddress:null})).toThrow();
    expect(() => validateProfileInput({displayName:'A', locale:'en', shippingAddress:{...address, line1:'x'.repeat(501)}})).toThrow();
  });
});
