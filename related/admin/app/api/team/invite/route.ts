import { inviteStaff, responseFor } from '@/features/team/service';
import { assertSameOrigin } from '@/lib/http/origin';
import { failure, readJson } from '@/lib/http/result';
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    const input = await readJson(request);
    return responseFor(await inviteStaff(input));
  } catch (error) {
    return failure(error);
  }
}
