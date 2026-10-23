import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
vi.mock('server-only', () => ({}));
const state = vi.hoisted(() => ({error:null as null | {status?:number; name?:string; code?:string; message?:string}}));
vi.mock('@/lib/auth/server', () => ({
  createClient:async () => ({auth:{
    signUp:async () => ({data:{session:null}, error:state.error}),
    resetPasswordForEmail:async () => ({error:state.error}),
  }}),
}));
vi.mock('@/lib/http/rate-limit', () => ({clientAddress:() => 'synthetic-address', enforceRateLimit:async () => {}}));
import {mailError} from './auth-input';
import {accountCopy, accountError} from './copy';
import {POST as register} from '@/app/api/auth/register/route';
import {POST as reset} from '@/app/api/auth/reset/route';

const rejected = [
  {code:'weak_password', status:422, expected:'INVALID_INPUT', http:400},
  {code:'email_address_invalid', status:422, expected:'INVALID_INPUT', http:400},
  {code:'validation_failed', status:400, expected:'INVALID_INPUT', http:400},
  {code:'signup_disabled', status:422, expected:'UNAVAILABLE', http:503},
  {code:'email_provider_disabled', status:400, expected:'UNAVAILABLE', http:503},
  {code:'future_unknown_failure', status:400, expected:'UNAVAILABLE', http:503},
  {code:undefined, status:400, expected:'UNAVAILABLE', http:503},
  {code:'unexpected_failure', status:500, expected:'UNAVAILABLE', http:503},
  {code:'over_email_send_rate_limit', status:429, expected:'RATE_LIMITED', http:429},
];
beforeEach(() => {state.error=null; vi.stubEnv('APP_ORIGIN','https://website.example');});
afterEach(() => {vi.unstubAllEnvs();});
function request(route:string, email='synthetic@example.test') {
  return new Request(`https://website.example/api/auth/${route}`, {
    method:'POST', headers:{origin:'https://website.example','content-type':'application/json'},
    body:JSON.stringify({email,password:'EightButWeak123',locale:'en'}),
  });
}

describe('safe Auth mail error classification', () => {
  for (const operation of ['register','reset'] as const) {
    it.each(rejected)(`${operation} rejects $code instead of claiming sent email`, error => {
      expect(() => mailError(error,operation)).toThrow(error.expected);
    });
    it(`${operation} preserves fetch failure handling`, () => {
      expect(() => mailError({name:'AuthRetryableFetchError'},operation)).toThrow('UNAVAILABLE');
    });
  }
  it('suppresses only operation-specific existence outcomes', () => {
    expect(() => mailError(null,'register')).not.toThrow();
    expect(() => mailError({status:422,code:'email_exists'},'register')).not.toThrow();
    expect(() => mailError({status:422,code:'user_already_exists'},'register')).not.toThrow();
    expect(() => mailError({status:404,code:'user_not_found'},'reset')).not.toThrow();
    expect(() => mailError({status:404,code:'user_not_found'},'register')).toThrow('UNAVAILABLE');
    expect(() => mailError({status:422,code:'email_exists'},'reset')).toThrow('UNAVAILABLE');
  });
});

describe('actual register/reset route envelopes', () => {
  for (const [operation,handler] of [['register',register],['reset',reset]] as const) {
    it.each(rejected)(`${operation} maps $code to a safe failure response`, async error => {
      state.error={...error,message:'Provider detail with synthetic@example.test'};
      const response=await handler(request(operation));
      expect(response.status).toBe(error.http);
      expect(response.headers.get('cache-control')).toContain('no-store');
      const result=await response.json();
      expect(result).toMatchObject({ok:false,error:error.expected,requestId:expect.any(String)});
      expect(JSON.stringify(result)).not.toContain('synthetic@example.test');
      expect(result).not.toHaveProperty('data.sent');
    });
  }
  it('register existing/new and reset unknown/existing have identical generic success envelopes', async () => {
    for (const code of ['email_exists','user_already_exists']) {
      state.error={status:422,code};
      const existing=await register(request('register','existing@example.test'));
      state.error=null;
      const fresh=await register(request('register','new@example.test'));
      expect(existing.status).toBe(200);expect(await existing.json()).toEqual(await fresh.json());
    }
    state.error={status:404,code:'user_not_found'};
    const unknown=await reset(request('reset','unknown@example.test'));
    state.error=null;
    const existing=await reset(request('reset','existing@example.test'));
    expect(unknown.status).toBe(200);expect(await unknown.json()).toEqual(await existing.json());
  });
  it('form feedback describes invalid input and unavailable service in every locale', () => {
    for (const locale of ['en','zh-hant','ja'] as const) {
      expect(accountError(locale,'INVALID_INPUT')).toBe(accountCopy[locale].invalid);
      expect(accountError(locale,'UNAVAILABLE')).toBe(accountCopy[locale].unavailable);
      expect(accountError(locale,'INVALID_INPUT')).not.toBe(accountCopy[locale].sent);
    }
  });
});
