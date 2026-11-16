import { archiveAsset } from '@/features/media/service';
import { responseFor } from '@/features/team/service';
import { assertSameOrigin } from '@/lib/http/origin';
import { failure, readJson } from '@/lib/http/result';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    const input = await readJson(request);
    return responseFor(await archiveAsset(input?.assetId));
  } catch (error) { return failure(error); }
}
