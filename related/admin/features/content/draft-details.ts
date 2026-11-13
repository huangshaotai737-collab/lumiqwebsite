import { formatAdminDateTime } from '@/lib/date-time';
export type DraftChange = { version: number; name: string; summary: string; savedAt: string };
export type DraftDetails = { name?: string; summary?: string; createdAt?: string; changes?: DraftChange[] };
export function draftName(draft: DraftDetails & { updatedAt: string }) {
  return draft.name || `官網內容・${formatAdminDateTime(draft.createdAt || draft.updatedAt)}`;
}
