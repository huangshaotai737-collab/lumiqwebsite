import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../generated/database';
import { HttpError } from './result';

// Only configure a header if the trusted ingress overwrites it and direct ingress is blocked.
// Without trusted ingress all callers share one conservative bucket; attacker headers are ignored.
export function clientAddress(request: Request): string {
  const header = process.env.REQUEST_IP_HEADER;
  if (!header) return 'unattributed';
  if (!['x-real-ip', 'x-vercel-forwarded-for'].includes(header)) throw new HttpError('UNAVAILABLE', 503);
  const address = request.headers.get(header)?.trim();
  if (!address || !isIP(address)) throw new HttpError('UNAVAILABLE', 503);
  return address;
}
export async function consumeRateLimit(scope: string, subject: string): Promise<{allowed: boolean; retryAfterSeconds: number}> {
  const salt = process.env.REQUEST_LIMIT_SALT;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!salt || salt.length < 32 || !url || !key) throw new HttpError('UNAVAILABLE', 503);
  // Do not include app name in the digest: both applications and all instances share limits.
  const digest = createHmac('sha256',salt).update(subject).digest('hex');
  const client = createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});
  const {data,error} = await client.rpc('consume_request_limit',{scope,subject_hash:digest});
  if (error || !data?.[0]) throw new HttpError('UNAVAILABLE',503);
  return {allowed:data[0].allowed,retryAfterSeconds:data[0].retry_after_seconds};
}
export async function enforceRateLimit(scope: string, subject: string) {
  const result = await consumeRateLimit(scope,subject);
  if (!result.allowed) throw new HttpError('RATE_LIMITED',429,result.retryAfterSeconds);
}
