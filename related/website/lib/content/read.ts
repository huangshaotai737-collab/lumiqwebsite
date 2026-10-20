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
export function createPublishedReader(load: () => Promise<unknown>, configured: () => boolean = () => true) {
  let lastWarning = -Infinity;
  let lastGood: PublishedContent | undefined;
  return async (): Promise<PublishedContent> => {
    let reason: 'load-failed' | 'missing-release' | 'invalid-snapshot' = 'load-failed';
    let attemptedReleaseId: string | null = null;
    try {
      const value = await load() as {releaseId?: unknown; snapshot?: unknown} | null;
      reason = 'missing-release';
      if (!value || typeof value.releaseId !== 'string' || !uuid.test(value.releaseId)) throw Error('No valid release');
      attemptedReleaseId = value.releaseId;
      reason = 'invalid-snapshot';
      const snapshot = parseSnapshot(value.snapshot);
      lastGood = { releaseId: value.releaseId as UUID, snapshot, source: 'published' };
      return lastGood;
    } catch {
      if (configured() && Date.now() - lastWarning >= 60_000) {
        lastWarning = Date.now();
        console.warn('[lumiq-content-fallback]', {reason, source:lastGood ? 'last-good' : 'bundled', releaseId:attemptedReleaseId, lastGoodReleaseId:lastGood?.releaseId || null});
      }
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
}, () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY));
/** React cache is request-scoped: SEO, i18n and all server consumers see one pointer. */
export const readPublishedContent = cache(read);
