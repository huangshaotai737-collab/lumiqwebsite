import { requireStaff } from '@/lib/auth/require-staff';
import { loadDraft } from '@/features/content/service';
import { contentFields } from '@/features/content/fields';
import { currentSnapshot } from '@/features/content/current-snapshot';
import { ContentEditor } from '@/features/content/ContentEditor';
export default async function ContentDraftPage({ params }: { params: Promise<{ id: string }> }) {
  let data;
  try {
    const { id } = await params;
    data = await Promise.all([requireStaff(['admin', 'editor']), loadDraft(id)]);
  } catch {
    return <p role="alert">無法載入草稿。請檢查草稿編號和當前權限或稍後重試。</p>;
  }
  const [actor, draft] = data;
  const fields = contentFields.filter(field => field.editable && (actor.role === 'admin' || !field.adminOnly))
    .map(({ path, pages, type, maxLength, icuSignature, mediaPurpose }) => ({ path, pages, type, maxLength, icuSignature, mediaPurpose }));
  let websiteOrigin: string | null = null;
  try { const configured = new URL(process.env.WEBSITE_ORIGIN || ''); if (['http:','https:'].includes(configured.protocol) && !configured.username && !configured.password && configured.pathname === '/' && !configured.search && !configured.hash) websiteOrigin=configured.origin; } catch { /* Missing deployment configuration disables the entry. */ }
  return <ContentEditor websiteOrigin={websiteOrigin} initial={draft} fields={fields} admin={actor.role === 'admin'} legacyMedia={Object.fromEntries(Object.entries(currentSnapshot.media).map(([key, slot]) => [key, slot.url]))} />;
}
