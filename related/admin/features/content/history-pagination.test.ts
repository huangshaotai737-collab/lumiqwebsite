import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { historyHref, historyPage, HistoryPagination } from './HistoryPagination';
import { RecentDrafts } from './DraftHistory';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
describe('independent history pages', () => {
  it('preserves the other list page and the appropriate anchor', () => {
    expect(historyHref('draft', 3, 2)).toBe('/content?draftPage=3&releasePage=2#recent-drafts');
    expect(historyHref('release', 3, 2)).toBe('/content?draftPage=2&releasePage=3#release-history');
  });
  it('validates URL parameters before sending integer arguments to the database', () => {
    for (const value of [undefined, '0', '-2', '1.5', 'foo', '2147483648', ['2']]) expect(historyPage(value)).toBe(1);
    expect(historyPage('12')).toBe(12);
  });
  it('has no previous link on the first page or next link on the last', () => {
    const first = renderToStaticMarkup(createElement(HistoryPagination, { kind: 'draft', pagination: { page: 1, total: 21, totalPages: 3 }, otherPage: 2 }));
    expect(first).toContain('每頁 10 筆'); expect(first).not.toContain('上一頁'); expect(first).toContain('下一頁');
    const last = renderToStaticMarkup(createElement(HistoryPagination, { kind: 'release', pagination: { page: 3, total: 21, totalPages: 3 }, otherPage: 2 }));
    expect(last).toContain('上一頁'); expect(last).not.toContain('下一頁');
  });
  it('only renders deletion for administrators, with a clear confirmation', () => {
    const drafts = [{ id: '60000000-0000-4000-8000-000000000001', name: '更新首頁', version: 3, status: 'editing' as const, updatedAt: '2026-11-13T00:00:00Z' }];
    const editor = renderToStaticMarkup(createElement(RecentDrafts, { drafts }));
    expect(editor).not.toContain('刪除草稿');
    const admin = renderToStaticMarkup(createElement(RecentDrafts, { drafts, admin: true }));
    expect(admin).toContain('danger-button'); expect(admin).toContain('確認刪除草稿'); expect(admin).toContain('目前官網內容不會改變');
  });
});
