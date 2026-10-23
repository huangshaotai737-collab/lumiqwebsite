import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '../generated/database';
import { HttpError } from '../http/result';
export function authConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
export async function createClient() {
  if (!authConfigured()) throw new HttpError('UNAVAILABLE', 503);
  const jar = await cookies();
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookieOptions: {name:'lumiq-website-auth',sameSite:'lax',path:'/',secure:process.env.APP_ORIGIN?.startsWith('https://') ?? false},
    global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try { values.forEach(({name,value,options}) => jar.set(name,value,options)); }
        catch { /* Server Components are read-only; proxy/middleware persists refreshed cookies. */ }
      },
    },
  });
}
