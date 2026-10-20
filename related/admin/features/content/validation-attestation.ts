import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/generated/database';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import { HttpError } from '@/lib/http/result';

// Must advance with the DB-owned policy in a reviewed migration when validation changes.
export const CONTENT_VALIDATION_POLICY = 'media-products-v3-20261021';
export async function attestSnapshot(input: {
  kind: 'draft' | 'release'; id: string; version: number;
  snapshot: ContentSnapshot; actorId: string;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError('UNAVAILABLE', 503);
  const trusted = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (resource, options) => fetch(resource, { ...options, cache: 'no-store' }) },
  });
  const { error } = await trusted.rpc('attest_content_snapshot', {
    purpose: input.kind, id: input.id, expected_version: input.version,
    normalized_snapshot: input.snapshot as unknown as Json,
    policy_version: CONTENT_VALIDATION_POLICY, actor_id: input.actorId,
  });
  if (error?.code === '23505') throw new HttpError('CONFLICT', 409);
  if (error?.code === '42501') throw new HttpError('FORBIDDEN', 403);
  if (error?.code === 'P0002') throw new HttpError('NOT_FOUND', 404);
  if (error) throw new HttpError('UNAVAILABLE', 503);
}
