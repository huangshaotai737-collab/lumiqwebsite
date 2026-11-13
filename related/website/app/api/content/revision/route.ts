import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/generated/database';
export const dynamic = 'force-dynamic';
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const headers = { 'Cache-Control': 'no-store' };
  if (!url || !key) return Response.json({ error: 'UNAVAILABLE' }, { status: 503, headers });
  const client = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (resource, init) => fetch(resource, { ...init, cache: 'no-store', signal: AbortSignal.timeout(5000) }) } });
  const { data, error } = await client.rpc('get_published_content_revision');
  return error ? Response.json({ error: 'UNAVAILABLE' }, { status: 503, headers }) : Response.json({ releaseId: data }, { headers });
}
