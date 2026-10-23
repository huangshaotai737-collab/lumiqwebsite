import { HttpError } from '@/lib/http/result';

export type MediaSearchParams = Record<string, string | string[] | undefined>;
export type MediaLibraryQuery = { q: string; usage: string; status: string; reference: string; page: number };
export type MediaReferences = {
  draftCount: number; releaseCount: number; currentPublication: boolean;
  drafts: { id: string; version: number; status: string; usageKey: string }[];
  releases: { id: string; usageKey: string; current: boolean }[];
  draftsTruncated: boolean; releasesTruncated: boolean;
};
export type LibraryAsset = { id: string; fileName: string; usageKey: string; mime: string; size: number; status: string; references: MediaReferences; previewUrl: string | null };
export type MediaLibraryPage = { items: Omit<LibraryAsset, 'previewUrl'>[]; total: number; page: number; pageSize: number };

export function parseMediaLibraryQuery(input: MediaSearchParams, usages: readonly string[]): MediaLibraryQuery {
  const value = (key: string) => { const raw = input[key]; if (raw !== undefined && typeof raw !== 'string') throw new HttpError('INVALID_INPUT', 400); return raw ?? ''; };
  const q = value('q'); const usage = value('usage'); const status = value('status'); const reference = value('reference'); const rawPage = value('page') || '1';
  if (q.length > 100 || (usage && !usages.includes(usage)) || !['', 'pending', 'ready', 'archived'].includes(status) || !['', 'draft', 'published', 'history', 'unreferenced'].includes(reference) || !/^[1-9][0-9]*$/.test(rawPage)) throw new HttpError('INVALID_INPUT', 400);
  const page = Number(rawPage);
  if (!Number.isInteger(page) || page > 2147483647) throw new HttpError('INVALID_INPUT', 400);
  return { q, usage, status, reference, page };
}

export function mediaLibraryHref(query: MediaLibraryQuery, page: number): string {
  const params = new URLSearchParams();
  for (const key of ['q', 'usage', 'status', 'reference'] as const) if (query[key]) params.set(key, query[key]);
  if (page > 1) params.set('page', String(page));
  return `/media${params.size ? `?${params}` : ''}`;
}
