import { beforeEach, describe, expect, it, vi } from 'vitest';
const deps = vi.hoisted(() => ({ rpc: vi.fn(), download: vi.fn(), bucket: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ rpc: deps.rpc, storage: { getBucket: deps.bucket, from: () => ({ download: deps.download }) } }) }));
import { GET } from '@/app/api/media/[assetId]/route';
const id = '70000000-0000-4000-8000-000000000001';
beforeEach(() => { vi.resetAllMocks(); process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic'; deps.bucket.mockResolvedValue({ data: { public: false }, error: null }); deps.rpc.mockResolvedValue({ data: null, error: null }); });
const get = (assetId = id, range?: string) => GET(new Request(`http://localhost/api/media/${assetId}`, { headers: range ? { Range: range } : {} }), { params: Promise.resolve({ assetId }) });
describe('published immutable media', () => {
  it('failed_media_publish_stays_private: an unreferenced copied asset returns 404 without reading storage', async () => {
    const response = await get(); expect(response.status).toBe(404); expect(response.headers.get('cache-control')).toContain('no-store'); expect(deps.download).not.toHaveBeenCalled();
  });
  it('accepts UUID only and never accepts paths or remote URLs', async () => {
    for (const value of ['../secret', 'https://example.test/x', id + '?path=x']) expect((await get(value)).status).toBe(404);
    expect(deps.rpc).not.toHaveBeenCalled();
  });
  it('serves trusted bytes, MIME, immutable caching and video range requests', async () => {
    deps.rpc.mockResolvedValue({ data: { id, path: `releases/${id}/${'a'.repeat(64)}`, mime: 'video/mp4', size: 6 }, error: null });
    deps.download.mockResolvedValue({ data: new Blob(['abcdef']), error: null });
    const response = await get(id, 'bytes=1-3'); expect(response.status).toBe(206); expect(await response.text()).toBe('bcd'); expect(response.headers.get('content-range')).toBe('bytes 1-3/6'); expect(response.headers.get('cache-control')).toContain('immutable');
  });
});

it('fails closed for public bucket drift, forged DB paths and invalid ranges', async () => {
  deps.bucket.mockResolvedValue({ data: { public: true }, error: null }); expect((await get()).status).toBe(404); expect(deps.rpc).not.toHaveBeenCalled();
  deps.bucket.mockResolvedValue({ data: { public: false }, error: null }); deps.rpc.mockResolvedValue({ data: { id,path:'../originals/secret',mime:'image/png',size:6 },error:null }); expect((await get()).status).toBe(404); expect(deps.download).not.toHaveBeenCalled();
  deps.rpc.mockResolvedValue({ data: {id,path:`releases/${id}/${'a'.repeat(64)}`,mime:'video/mp4',size:6},error:null });deps.download.mockResolvedValue({data:new Blob(['abcdef']),error:null});
  expect((await get(id,'bytes=9-99')).status).toBe(416);
  const suffix=await get(id,'bytes=-2');expect(suffix.status).toBe(206);expect(await suffix.text()).toBe('ef');
});
