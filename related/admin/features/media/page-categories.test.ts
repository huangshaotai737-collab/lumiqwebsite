import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { uploadProfiles } from './upload-profiles';
import { mediaPages } from './page-categories';
import { UsagePicker } from './UsagePicker';
import { parseMediaLibraryQuery, mediaLibraryHref } from './library-query';
const profiles = uploadProfiles({}, 'https://lumiq.example', 20971520, false);
describe('page-first media selection', () => {
  it('assigns every upload slot to a known page and keeps shared slots out of page-specific lists', () => {
    for (const profile of profiles) {
      expect(profile.pages.length).toBeGreaterThan(0);
      expect(profile.pages.every(page => mediaPages.some(([key]) => key === page))).toBe(true);
    }
    expect(profiles.find(item => item.fileName === 'tablet-growth.webp')!.pages).toEqual(['/products/tablet']);
    expect(profiles.find(item => item.fileName === 'prelaunch-flow-clean.webp')!.pages).toEqual(['shared']);
  });
  it('opens the selected page rather than rendering all 128 thumbnails at once', () => {
    const html = renderToStaticMarkup(createElement(UsagePicker, { profiles, value: profiles[0].key, onChange() {} }));
    expect((html.match(/name="upload-usage"/g) || []).length).toBe(profiles.filter(item => item.pages.includes('/')).length);
    expect(html).toContain('Ola 詳情頁'); expect(html).toContain('全站共用');
  });
  it('hides archived materials by default and preserves explicit all-status across pagination', () => {
    expect(parseMediaLibraryQuery({}, [])).toMatchObject({ status: 'ready' });
    const query = parseMediaLibraryQuery({ status: '' }, []);
    expect(query.status).toBe(''); expect(mediaLibraryHref(query, 2)).toBe('/media?status=&page=2');
  });
});
