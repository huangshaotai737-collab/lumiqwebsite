import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../generated/database';
export function createClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookieOptions: { name: 'lumiq-admin-auth', sameSite: 'lax', path: '/', secure: typeof window !== 'undefined' && window.location.protocol === 'https:' } });
}
