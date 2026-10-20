import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { initialSnapshot } from '@/lib/content/initial-snapshot';
import { createPublishedReader } from '@/lib/content/read';
import { resolveMediaSlot } from '@/lib/content/media';
const releaseId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
describe('published content request source', () => {
  it('reads the pointer on every request, keeps only validated last-good, and rejects empty/bad schema', async () => {
    let value: unknown = null;
    const read = createPublishedReader(async () => value);
    expect((await read()).source).toBe('bundled');
    const snapshot = structuredClone(initialSnapshot);
    (snapshot.messages.en.HomeRefresh as Record<string,string>).hero1 = 'Published example';
    value = { releaseId, snapshot };
    expect(await read()).toMatchObject({source:'published',releaseId,snapshot});
    value = { releaseId, snapshot: {...snapshot,schemaVersion:9} };
    expect(await read()).toMatchObject({source:'last-good',releaseId,snapshot});
    value = null;
    expect((await read()).source).toBe('last-good');
    value = {releaseId:'bad',snapshot};
    expect((await read()).source).toBe('last-good');
  });
  it('cold failures use bundled, subsequent database failures keep the complete last-good release', async () => {
    let fail = true;
    const read = createPublishedReader(async () => { if(fail) throw Error('database down'); return {releaseId,snapshot:initialSnapshot}; });
    expect((await read()).source).toBe('bundled'); fail=false;
    expect((await read()).source).toBe('published'); fail=true;
    expect((await read()).source).toBe('last-good');
  });
  it('resolves exact stable slots, never substitutes another asset with the same profile', () => {
    const a = 'asset_a4b2063e90484449', b = 'asset_1469a0e144ef7e2a';
    expect(resolveMediaSlot(initialSnapshot,a)).toEqual(initialSnapshot.media[a]);
    expect(resolveMediaSlot(initialSnapshot,b)).toEqual(initialSnapshot.media[b]);
    expect(resolveMediaSlot(initialSnapshot,a).url).not.toBe(resolveMediaSlot(initialSnapshot,b).url);
    expect(() => resolveMediaSlot(initialSnapshot,'film')).toThrow();
  });
});

it('maps distinct usages of one broad profile and keeps canonical per-use alt text independent',async()=>{
  const {createContentAdapter}=await import('@/lib/content/adapter');
  const snapshot=structuredClone(initialSnapshot),id='asset_38c045ee1dd24e31';
  const original=snapshot.media[id].url;
  snapshot.media[id]={...snapshot.media[id],assetId:releaseId,url:`/api/media/${releaseId}`,alt:'Updated Go art'};
  (snapshot.messages.en.CmsStatic as Record<string,string>).field_430041fc9b25a88e='Header-specific logo text';
  const publicContent=createContentAdapter(snapshot,'en'),preview=createContentAdapter(snapshot,'en',true);
  expect(publicContent.url(original)).toBe(`/api/media/${releaseId}`);
  expect(preview.url(original)).toBe(`/api/content/preview-media/${releaseId}`);
  expect(publicContent.slot(id).alt).toBe('Updated Go art');
  expect(publicContent.text('field_430041fc9b25a88e')).toBe('Header-specific logo text');
  expect(publicContent.url('/assets/home-video/ola-scroll-v16-start-20260909.webp')).toBe(initialSnapshot.media.asset_76a5de3f207ca5bb.url);
});
