import Link from 'next/link';
import type { ContentPagination } from './service';
export function historyHref(kind: 'draft' | 'release', page: number, otherPage: number) {
  const query = new URLSearchParams({ draftPage: String(kind === 'draft' ? page : otherPage), releasePage: String(kind === 'release' ? page : otherPage) });
  return `/content?${query}#${kind === 'draft' ? 'recent-drafts' : 'release-history'}`;
}
export function HistoryPagination({ kind, pagination, otherPage }: { kind: 'draft' | 'release'; pagination: ContentPagination; otherPage: number }) {
  return <nav className="history-pagination" aria-label={kind === 'draft' ? '草稿分頁' : '發佈與回滾記錄分頁'}>
    <span>共 {pagination.total} 筆，每頁 10 筆 · 第 {pagination.page} / {pagination.totalPages} 頁</span>
    {pagination.page > 1 && <Link href={historyHref(kind, pagination.page - 1, otherPage)}>上一頁</Link>}
    {pagination.page < pagination.totalPages && <Link href={historyHref(kind, pagination.page + 1, otherPage)}>下一頁</Link>}
  </nav>;
}
export function historyPage(value: string | string[] | undefined) {
  const page = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : 1;
  return Number.isSafeInteger(page) && page > 0 && page <= 2147483647 ? page : 1;
}
