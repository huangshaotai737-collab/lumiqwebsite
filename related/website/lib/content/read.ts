import 'server-only';
import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { initialSnapshot } from './initial-snapshot';
import { parseSnapshot } from './parse';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import type { UUID } from '@/lib/generated/platform/core';
import type { Database } from '@/lib/generated/database';
export type PublishedContent = { releaseId: UUID | null; snapshot: ContentSnapshot; source: 'published' | 'last-good' | 'bundled' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** One validated complete release per process; never cache failures or draft data. */
export function createPublishedReader(load: () => Promise<unknown>) {
  let lastGood: PublishedContent | undefined;
  return async (): Promise<PublishedContent> => {
    try {
      const value = await load() as {releaseId?: unknown; snapshot?: unknown} | null;
      if (!value || typeof value.releaseId !== 'string' || !uuid.test(value.releaseId)) throw Error('No valid release');
      const snapshot = parseSnapshot(value.snapshot);
      lastGood = { releaseId: value.releaseId as UUID, snapshot, source: 'published' };
      return lastGood;
    } catch {
      return lastGood ? {...lastGood, source: 'last-good'} : {releaseId:null,snapshot:initialSnapshot,source:'bundled'};
    }
  };
}
const read = createPublishedReader(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  // This client is deliberately anonymous: public pages do not inspect or refresh Auth cookies.
  const client = createClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(resource,init)=>fetch(resource,{...init,cache:'no-store',signal:AbortSignal.timeout(5000)})}});
  const result = await client.rpc('get_published_content');
  if(result.error) throw Error('Published content unavailable');
  return result.data;
});
/** React cache is request-scoped: SEO, i18n and all server consumers see one pointer. */
export const readPublishedContent = cache(read);
