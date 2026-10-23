import { createDraft, loadDraft, saveDraft, submitDraft } from '@/features/content/service';
import { responseFor } from '@/features/team/service';
import { assertSameOrigin } from '@/lib/http/origin';
import { failure, HttpError, success } from '@/lib/http/result';
export async function GET(request: Request) {
  try { return success(await loadDraft(new URL(request.url).searchParams.get('id') || '')); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || '');
    let input; try { input = await request.json(); } catch { throw new HttpError('INVALID_INPUT', 400); }
    if (input?.action === 'create') return responseFor(await createDraft());
    if (input?.action === 'submit') return responseFor(await submitDraft(input));
    return responseFor(await saveDraft(input));
  } catch (error) { return failure(error); }
}
