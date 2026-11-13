import {createClient as sdkClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/auth/server';
import {requireStaff} from '@/lib/auth/require-staff';
import {failure,HttpError} from '@/lib/http/result';
import type {Database} from '@/lib/generated/database';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{assetId:string}>}) {
  try {
    await requireStaff(['admin','editor']);
    const {assetId}=await params;
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(assetId))throw new HttpError('NOT_FOUND',404);
    const client=await createClient(); const result=await client.rpc('get_media_assets',{asset_id:assetId});
    const asset=(result.data as unknown as Database['public']['Tables']['media_assets']['Row'][]|null)?.[0];
    const metadata=asset?.metadata as {size?:number;sha256?:string}|null;
    if(result.error||!asset||asset.id!==assetId||!['ready','archived'].includes(asset.status)||!metadata?.sha256||!Number.isSafeInteger(metadata.size)||!metadata.size||metadata.size>52428800||!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(asset.mime)||!new RegExp(`^[0-9a-f-]{36}/${assetId}$`,'i').test(asset.original_path))throw new HttpError('NOT_FOUND',404);
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!url||!key)throw new HttpError('UNAVAILABLE',503);
    const trusted=sdkClient<Database>(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store'})}});
    const bucket=await trusted.storage.getBucket('media-originals');
    if(bucket.error||!bucket.data||bucket.data.public)throw new HttpError('UNAVAILABLE',503);
    const object=await trusted.storage.from('media-originals').download(asset.original_path);
    if(object.error||!object.data||object.data.size!==metadata.size)throw new HttpError('NOT_FOUND',404);
    return new Response(object.data,{headers:{'Content-Type':asset.mime,'Content-Length':String(object.data.size),'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
  }catch(error){return failure(error);}
}
