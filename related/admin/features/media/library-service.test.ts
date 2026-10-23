import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadMediaLibrary } from './service';
import { HttpError } from '@/lib/http/result';

const deps = vi.hoisted(() => ({ staff: vi.fn(), rpc: vi.fn(), bucket: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/require-staff', () => ({ requireStaff: deps.staff }));
vi.mock('@/lib/auth/server', () => ({ createClient: async () => ({ rpc: deps.rpc }) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { getBucket: deps.bucket } }) }));
const id = 'abed1700-0000-4000-8000-000000000001';
const usage = 'asset_012d3bf8af92d486';
const legacy = { id, file_name: 'older-than-200.png', usage_key: usage, mime: 'image/png', advertised_size: 123, status: 'ready' };
const item = { id, fileName: 'older-than-200.png', usageKey: usage, mime: 'image/png', size: 123, status: 'ready', references: { draftCount: 1, releaseCount: 8, currentPublication: true, drafts: [{ id: 'abed1700-0000-4000-8000-000000000002', version: 3, status: 'submitted', usageKey: usage }], releases: [{ id: 'abed1700-0000-4000-8000-000000000003', usageKey: usage, current: true }], draftsTruncated: false, releasesTruncated: true } };
beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic'; process.env.MEDIA_STORAGE_MAX_BYTES = '52428800';
  deps.staff.mockResolvedValue({ userId: id, role: 'editor' });
  deps.bucket.mockResolvedValue({ data: { public: false, file_size_limit: 52428800 }, error: null });
  deps.rpc.mockImplementation(async (name, input) => name === 'list_media_library' && input.search === 'older-than-200' && input.page === 2
    ? { data: { items: [item], total: 26, page: 2, pageSize: 25 }, error: null }
    : { data: [legacy], error: null });
});
describe('whole-library server read', () => {
  it('returns the filtered database total and actual references beyond the recent 200', async () => {
    const result = await loadMediaLibrary({ q: 'older-than-200', page: '2' });
    expect(result).toMatchObject({ total: 26, page: 2, pageSize: 25, assets: [{ id, previewUrl: `/api/media/preview?assetId=${id}`, references: { draftCount: 1, releaseCount: 8, currentPublication: true, releasesTruncated: true } }] });
    expect(JSON.stringify(result)).not.toContain('original_path');
  });
  it('rejects malformed or ambiguous URL filters instead of silently loading recent assets', async () => {
    for (const query of [{ page: '0' }, { page: '1.5' }, { page: '2147483648' }, { q: 'x'.repeat(101) }, { q: ['first', 'second'] }, { usage: '__proto__' }, { status: 'deleted' }, { reference: 'secret' }]) {
      await expect(loadMediaLibrary(query)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    }
  });
  it('keeps denied current employees out after a previously authorized page', async () => {
    expect(await loadMediaLibrary({ q: 'older-than-200', page: '2' })).toMatchObject({ total: 26 });
    deps.staff.mockRejectedValue(new HttpError('FORBIDDEN', 403));
    await expect(loadMediaLibrary({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('propagates database denial instead of claiming an empty library', async () => {
    deps.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    await expect(loadMediaLibrary({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('never previews pending bytes and preserves an empty page and its total', async () => {
    deps.rpc.mockResolvedValueOnce({ data: { items: [{ ...item, status: 'pending' }], total: 1, page: 1, pageSize: 25 }, error: null })
      .mockResolvedValueOnce({ data: { items: [], total: 0, page: 1, pageSize: 25 }, error: null });
    expect(await loadMediaLibrary({})).toMatchObject({ assets: [{ previewUrl: null }] });
    expect(await loadMediaLibrary({})).toMatchObject({ assets: [], total: 0 });
  });
});
