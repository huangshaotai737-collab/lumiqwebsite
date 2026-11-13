import { removeWebsiteImage } from '@/features/content/service';
import { responseFor } from '@/features/team/service';
import { assertSameOrigin } from '@/lib/http/origin';
import { failure, readJson } from '@/lib/http/result';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    return responseFor(await removeWebsiteImage(await readJson(request)));
  } catch (error) { return failure(error); }
}
