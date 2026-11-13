import { describe, expect, it } from 'vitest';
import profiles from './profiles.json';
import locations from './locations.json';
import { mediaPresentation, matchesMedia } from './presentation';
import { uploadProfiles } from './upload-profiles';
import { contentFields } from '@/features/content/fields';
import { currentSnapshot } from '@/features/content/current-snapshot';

const origin = 'https://lumiq.example';
const cap = 20971520;
const keyFor = (filename: string) => Object.keys(profiles).find(key => profiles[key as keyof typeof profiles].legacyUrl.endsWith(`/${filename}`))!;
describe('visual media catalogue', () => {
  it('names all editable media fields, including the brand scene that does not accept uploads', () => {
    const fields = contentFields.filter(field => field.editable && field.path.startsWith('media.'));
    for (const field of fields) expect(mediaPresentation(field.path.split('.')[1]).title).toBeTruthy();
    const key = 'asset_1cda2c90e6c65f98';
    expect(mediaPresentation(key).title).toBe('Ola 成人與長輩陪伴');
    expect(uploadProfiles(currentSnapshot.media, origin, cap, false).some(item => item.key === key)).toBe(false);
  });
  it('names every allowed slot and keeps its exact identifier and page associations', () => {
    const catalogue = uploadProfiles(currentSnapshot.media, origin, cap, false);
    expect(catalogue).toHaveLength(Object.keys(profiles).length);
    expect(new Set(catalogue.map(profile => profile.key)).size).toBe(catalogue.length);
    for (const entry of catalogue) {
      expect(entry.title).toBeTruthy();
      expect(entry.title).not.toMatch(/undefined|asset_[a-f\d]+|\.(png|webp|mp4)$/);
      const expected = [...new Set(contentFields.filter(field => field.path === `media.${entry.key}.assetId`).flatMap(field => field.pages))].sort();
      expect(locations[entry.key as keyof typeof locations]).toEqual(expected);
    }
  });
  it('finds a scene by its content, original filename, stable ID, or page, within the selected group', () => {
    const key = keyFor('tablet-growth.webp');
    const entry = { key, ...mediaPresentation(key) };
    for (const query of ['父女共讀', 'TABLET-GROWTH', key, 'Tablet 產品頁']) expect(matchesMedia(entry, query, '')).toBe(true);
    expect(matchesMedia(entry, '父女共讀', 'Ola')).toBe(false);
    expect(matchesMedia(entry, '不存在的場景', '')).toBe(false);
  });
  it('distinguishes mobile and desktop backgrounds with the same original filename', () => {
    const matching = Object.keys(profiles).filter(key => profiles[key as keyof typeof profiles].legacyUrl.endsWith('/family.webp'));
    const names = matching.map(key => mediaPresentation(key).title);
    expect(names.some(title => title.includes('手機版'))).toBe(true);
    expect(new Set(names).size).toBe(names.length);
  });
  it('previews the exact published asset rather than silently showing its bundled original', () => {
    const key = keyFor('tablet-growth.webp'), id = 'abed1700-0000-4000-8000-000000000001';
    const media = structuredClone(currentSnapshot.media);
    media[key] = { ...media[key], assetId: id, url: `/api/media/${id}` };
    const item = uploadProfiles(media, origin, cap, true).find(item => item.key === key)!;
    expect(item.previewUrl).toBe(`/api/media/preview?assetId=${id}`);
    expect(item.previewSource).toBe('官網目前素材');
    media[key] = { ...media[key], assetId: null, url: '/assets/approved-new-image.png' };
    expect(uploadProfiles(media, origin, cap, true).find(item => item.key === key)?.previewUrl).toBe(`${origin}/assets/approved-new-image.png`);
  });
  it('keeps historical slots previewable without claiming they are currently published', () => {
    const historical = uploadProfiles({}, origin, cap, true);
    expect(historical.every(item => item.previewSource === '原始參考素材')).toBe(true);
    expect(historical[0].previewUrl).toBe(`${origin}${profiles[historical[0].key as keyof typeof profiles].legacyUrl}`);
    expect(uploadProfiles({}, null, cap, false).every(item => item.previewUrl === null)).toBe(true);
  });
  it('preserves upload limits, allowed formats, and pairing requirements while adding previews', () => {
    for (const item of uploadProfiles({}, origin, cap, false)) {
      const profile = profiles[item.key as keyof typeof profiles];
      expect(item.maxBytes).toBeLessThanOrEqual(cap);
      expect(item.mimes).toEqual(profile.mimes);
      expect(item.companions).toEqual(profile.companions.map(key => mediaPresentation(key).title));
      if (item.kind === 'video' && profile.companions.length) expect(item.posterUrl).toBeTruthy();
    }
  });
});
