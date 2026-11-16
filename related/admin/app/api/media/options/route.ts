import { listMediaOptions } from '@/features/media/service';
import { responseFor } from '@/features/team/service';
import { failure } from '@/lib/http/result';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const createdAt = params.get('afterCreatedAt'); const id = params.get('afterId');
    return responseFor(await listMediaOptions({ usageKey: params.get('usageKey') || '', q: params.get('q') || '', ...(createdAt !== null || id !== null ? { cursor: { createdAt: createdAt || '', id: id || '' } } : {}) }));
  } catch (error) { return failure(error); }
}
