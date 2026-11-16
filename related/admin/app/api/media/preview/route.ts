import { previewAsset } from '@/features/media/service';
import { failure } from '@/lib/http/result';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try { return await previewAsset(new URL(request.url).searchParams.get('assetId') || ''); }
  catch (error) { return failure(error); }
}
