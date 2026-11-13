import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/generated/database';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const missing = () => new Response(null, { status: 404, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  if (!uuid.test(assetId)) return missing();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return missing();
  try {
    const trusted = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: (resource, options) => fetch(resource, { ...options, cache: 'no-store' }) } });
    const bucket = await trusted.storage.getBucket('media-releases');
    if (bucket.error || !bucket.data || bucket.data.public) return missing();
    const proof = await trusted.rpc('get_public_asset', { asset_id: assetId });
    const asset = proof.data as unknown as { id: string; path: string; mime: string; size: number } | null;
    if (proof.error || !asset || asset.id !== assetId || !new RegExp(`^releases/${assetId}/[a-f0-9]{64}$`, 'i').test(asset.path) || !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'].includes(asset.mime)) return missing();
    const { data, error } = await trusted.storage.from('media-releases').download(asset.path);
    if (error || !data || data.size !== asset.size) return missing();
    const headers = new Headers({ 'Content-Type': asset.mime, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Content-Length': String(data.size) });
    const range = request.headers.get('range');
    if (!range) return new Response(data, { headers });
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    let start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Math.min(Number(match[2]), data.size - 1) : data.size - 1;
    if (match && !match[1] && match[2]) { start = Math.max(0, data.size - Number(match[2])); }
    const last = match && !match[1] ? data.size - 1 : end;
    if (!match || (!match[1] && !match[2]) || !Number.isSafeInteger(start) || !Number.isSafeInteger(last) || start > last || start >= data.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${data.size}`, 'Cache-Control': 'private, no-store' } });
    headers.set('Content-Range', `bytes ${start}-${last}/${data.size}`); headers.set('Content-Length', String(last - start + 1));
    return new Response(data.slice(start, last + 1), { status: 206, headers });
  } catch { return missing(); }
}
