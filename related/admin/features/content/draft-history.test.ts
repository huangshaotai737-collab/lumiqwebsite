import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RecentDrafts, DraftChanges } from './DraftHistory';
const draft = { id: '60000000-0000-4000-8000-000000000001', version: 2, status: 'editing' as const, updatedAt: '2026-11-13T07:00:00Z', createdAt: '2026-11-12T07:00:00Z' };
describe('readable draft history', () => {
  it('shows names, summaries, created and updated times without rendering UUID labels', () => {
    const html = renderToStaticMarkup(createElement(RecentDrafts, { drafts: [{ ...draft, name: '首頁圖片調整', summary: '替換父女共讀圖片' }] }));
    expect(html).toContain('首頁圖片調整'); expect(html).toContain('替換父女共讀圖片');
    expect(html).toContain('建立時間'); expect(html).toContain('最後修改時間');
    expect(html).not.toContain(`>${draft.id}<`);
  });
  it('gives legacy drafts dated names and honestly distinguishes missing historical notes', () => {
    const html = renderToStaticMarkup(createElement(RecentDrafts, { drafts: [draft] }));
    expect(html).toContain('官網內容・'); expect(html).toContain('早期草稿');
    const notes = renderToStaticMarkup(createElement(DraftChanges, { changes: [{ version: 2, name: '更新圖片', summary: '<script>修改</script>', savedAt: draft.updatedAt }] }));
    expect(notes).toContain('&lt;script&gt;'); expect(notes).toContain('第 2 版');
  });
});
