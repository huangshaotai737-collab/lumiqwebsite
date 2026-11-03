import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '../generated/database';
import {websiteCookieOptions} from './cookie-options';
export function createClient() {
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { cookieOptions: websiteCookieOptions(typeof window !== 'undefined' && window.location.protocol === 'https:') });
}
