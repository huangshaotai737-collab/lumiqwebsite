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

// Regression: a safe-looking URL must not replace a trusted legacy slot.
it('rejects a null-ID Safari legacy swap while accepting the original', async () => {
  const {parseSnapshot}=await import('@/lib/content/parse');
  expect(() => parseSnapshot(initialSnapshot)).not.toThrow();
  const changed=structuredClone(initialSnapshot);
  changed.media.asset_6f36183e6da5cc73.url='/assets/films-20260908/welcome-home.mp4';
  expect(() => parseSnapshot(changed)).toThrow();
});
it('reports repeated fallback safely without flooding and preserves last good', async () => {
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  vi.useFakeTimers();
  try {
    let fail=false;
    const reader=createPublishedReader(async()=>{if(fail)throw Error('SECRET email@example.test upstream');return {releaseId,snapshot:initialSnapshot};});
    await reader();fail=true;
    for(let i=0;i<20;i++) expect((await reader()).source).toBe('last-good');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/SECRET|email@example|messages/);
    vi.advanceTimersByTime(61000);await reader();expect(warn).toHaveBeenCalledTimes(2);
  } finally {warn.mockRestore();vi.useRealTimers();}
});

it('unconfigured local content is quiet, configured missing/invalid releases report safe categories',async()=>{
 const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
 try {
  expect((await createPublishedReader(async()=>null,()=>false)()).source).toBe('bundled');
  expect(warn).not.toHaveBeenCalled();
  await createPublishedReader(async()=>null)();
  expect(warn.mock.calls[0][1]).toMatchObject({reason:'missing-release',source:'bundled',releaseId:null});
  await createPublishedReader(async()=>({releaseId,snapshot:{private:'SECRET'}}))();
  expect(warn.mock.calls[1][1]).toMatchObject({reason:'invalid-snapshot',releaseId});
  expect(JSON.stringify(warn.mock.calls)).not.toContain('SECRET');
 }finally{warn.mockRestore();}
});
