import { requireStaff } from '@/lib/auth/require-staff';
import { loadDraft } from '@/features/content/service';
import { contentFields } from '@/features/content/fields';
import initialSnapshot from '@/features/content/initial-snapshot.json';
import { ContentEditor } from '@/features/content/ContentEditor';
export default async function ContentDraftPage({ params }: { params: Promise<{ id: string }> }) {
  let data;
  try {
    const { id } = await params;
    data = await Promise.all([requireStaff(['admin', 'editor']), loadDraft(id)]);
  } catch {
    return <p role="alert">无法载入草稿。请检查草稿编号和当前权限或稍后重试。</p>;
  }
  const [actor, draft] = data;
  const fields = contentFields.filter(field => field.editable && (actor.role === 'admin' || !field.adminOnly))
    .map(({ path, pages, type, maxLength, icuSignature, mediaPurpose }) => ({ path, pages, type, maxLength, icuSignature, mediaPurpose }));
  return <ContentEditor initial={draft} fields={fields} admin={actor.role === 'admin'} legacyMedia={Object.fromEntries(Object.entries(initialSnapshot.media).map(([key, slot]) => [key, slot.url]))} />;
}
