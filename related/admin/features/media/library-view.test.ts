import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { MediaLibrary } from './MediaLibrary';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
const query = { q: 'old & rare', usage: '', status: 'archived', reference: 'published', page: 2 };
const profiles = [{ key: 'asset_012d3bf8af92d486', kind: 'image', profile: 'public-content', label: '靜態圖片 · evening.webp', maxBytes: 20971520, mimes: ['image/png'], companions: [], reason: null, constraints: 'JPEG / PNG / WebP' }];
const asset = { id: 'abed1700-0000-4000-8000-000000000001', fileName: 'photo.png', usageKey: 'asset_012d3bf8af92d486', mime: 'image/png', size: 1, status: 'archived', previewUrl: null, references: { draftCount: 0, releaseCount: 8, currentPublication: true, drafts: [], releases: [{ id: 'abed1700-0000-4000-8000-000000000003', usageKey: 'asset_012d3bf8af92d486', current: true }], draftsTruncated: false, releasesTruncated: true } };
describe('media library read presentation', () => {
  it('shows an exact filtered total, keeps URL filters while paging, and reveals actual current references', () => {
    const html = renderToStaticMarkup(createElement(MediaLibrary, { assets: [asset], profiles, total: 26, page: 2, pageSize: 25, query }));
    expect(html).toContain('共 26 條');
    expect(html).toContain('q=old+%26+rare&amp;status=archived&amp;reference=published');
    expect(html).toContain('當前官網引用');
    expect(html).toContain('abed1700-0000-4000-8000-000000000003');
    expect(html).toContain('僅展示最近 5 處發佈引用');
  });
  it('distinguishes no search matches from a requested page beyond the result', () => {
    const empty = renderToStaticMarkup(createElement(MediaLibrary, { assets: [], profiles, total: 0, page: 1, pageSize: 25, query: { ...query, page: 1 } }));
    expect(empty).toContain('沒有符合條件的素材');
    const pastEnd = renderToStaticMarkup(createElement(MediaLibrary, { assets: [], profiles, total: 26, page: 3, pageSize: 25, query: { ...query, page: 3 } }));
    expect(pastEnd).toContain('此頁沒有素材');
    expect(pastEnd).toContain('返回第一頁');
  });
});
