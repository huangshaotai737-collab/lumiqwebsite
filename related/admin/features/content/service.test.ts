import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from './initial-snapshot.json';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import { createDraft, saveDraft as saveDraftRequest, publishDraft, rollbackRelease, removeWebsiteImage, deleteContentRecord } from './service';
const dependencies = vi.hoisted(() => ({
  requireStaff: vi.fn(), enforceRateLimit: vi.fn(), rpc: vi.fn(), attest: vi.fn(),
}));
vi.mock('@/features/media/service', () => ({ prepareReleaseAssets: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/require-staff', () => ({ requireStaff: dependencies.requireStaff }));
vi.mock('@/lib/http/rate-limit', () => ({ enforceRateLimit: dependencies.enforceRateLimit }));
vi.mock('@/lib/auth/server', () => ({ createClient: async () => ({ rpc: dependencies.rpc }) }));
vi.mock('./validation-attestation', () => ({ attestSnapshot: dependencies.attest }));
const id = '60000000-0000-4000-8000-000000000001';
const saveDraft = (input: Parameters<typeof saveDraftRequest>[0]) => saveDraftRequest({ name: '首頁內容調整', summary: '更新首頁產品介紹', ...input });
const snapshot = () => structuredClone(fixture) as ContentSnapshot;
beforeEach(() => {
  vi.resetAllMocks();
  dependencies.requireStaff.mockResolvedValue({ userId: id, role: 'admin' });
  dependencies.rpc.mockResolvedValue({ data: { id, version: 1 }, error: null });
});
describe('server content boundary', () => {
  it('requires a concise name and summary and sends both in the same atomic save', async () => {
    for (const fields of [{ name: '', summary: '說明' }, { name: '草稿', summary: '  ' }, { name: '字'.repeat(101), summary: '說明' }, { name: '草稿', summary: '字'.repeat(241) }]) {
      expect(await saveDraft({ id, expectedVersion: 0, snapshot: snapshot(), ...fields })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    }
    expect(dependencies.rpc).not.toHaveBeenCalled();
    await saveDraft({ id, expectedVersion: 0, snapshot: snapshot(), name: '  首頁調整  ', summary: '  替換共讀圖片  ' });
    expect(dependencies.rpc).toHaveBeenCalledWith('save_described_content_draft', expect.objectContaining({ draft_name: '首頁調整', change_summary: '替換共讀圖片', expected_version: 0 }));
  });
  it('normalizes aliases before saving, without changing caller input', async () => {
    const value = snapshot(); value.settings.contactText.en = 'Updated contact';
    const previous = value.messages.en.Contact;
    expect((await saveDraft({ id, expectedVersion: 0, snapshot: value })).ok).toBe(true);
    const saved = dependencies.rpc.mock.calls[0][1].snapshot;
    expect(saved.messages.en.Contact.intro).toBe('Updated contact');
    expect(value.messages.en.Contact).toEqual(previous);
    expect(dependencies.enforceRateLimit).toHaveBeenCalledWith('write', id);
  });
  it('returns field errors for malformed ICU and missing translations before any write', async () => {
    const value = snapshot(); (value.messages.en.Home as Record<string, unknown>).title = 'Broken {';
    delete (value.messages as Partial<ContentSnapshot['messages']>).ja;
    const result = await saveDraft({ id, expectedVersion: 0, snapshot: value });
    expect(result).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect('issues' in result && result.issues).toEqual(expect.arrayContaining([expect.objectContaining({ path: expect.any(String) })]));
    expect(dependencies.rpc).not.toHaveBeenCalled();
  });
  it('rejects editor settings changes before saving a full snapshot', async () => {
    dependencies.requireStaff.mockResolvedValue({ userId: id, role: 'editor' });
    dependencies.rpc.mockResolvedValue({ data: { id, version: 1, snapshot: snapshot() }, error: null });
    const value = snapshot(); value.settings.supportEmail = 'changed@example.test';
    expect(await saveDraft({ id, expectedVersion: 1, snapshot: value })).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(dependencies.rpc.mock.calls.map(call => call[0])).toEqual(['get_content_draft']);
  });
  it('rejects malformed identifiers and unsafe versions', async () => {
    for (const expectedVersion of [-1, 1.2, Number.MAX_SAFE_INTEGER + 1, '1']) {
      expect(await saveDraft({ id, expectedVersion, snapshot: snapshot() } as never)).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    }
    expect(await publishDraft({ id: 'bad', expectedVersion: 1 })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
  });
  it('never attests an invalid raw draft obtained by direct RPC', async () => {
    const value = snapshot(); value.settings.contactText.en = 'Contact {';
    dependencies.rpc.mockResolvedValue({ data: { id, version: 3, snapshot: value }, error: null });
    expect(await publishDraft({ id, expectedVersion: 3 })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect(dependencies.attest).not.toHaveBeenCalled();
    expect(dependencies.rpc.mock.calls.map(call => call[0])).toEqual(['get_content_draft']);
  });
  it('binds trusted validation to the exact fetched snapshot/version/actor before user-authorized publication', async () => {
    dependencies.rpc.mockResolvedValueOnce({ data: { id, version: 4, snapshot: snapshot() }, error: null })
      .mockResolvedValueOnce({ data: id, error: null });
    expect(await publishDraft({ id, expectedVersion: 4 })).toEqual({ ok: true, data: { releaseId: id } });
    expect(dependencies.attest).toHaveBeenCalledWith(expect.objectContaining({ kind: 'draft', id, version: 4, actorId: id, snapshot: snapshot() }));
    expect(dependencies.rpc.mock.calls[1]).toEqual(['publish_content_draft', { id, expected_version: 4 }]);
  });
  it('rejects changed versions without attesting and maps final SQL race conflicts', async () => {
    dependencies.rpc.mockResolvedValueOnce({ data: { id, version: 5, snapshot: snapshot() }, error: null });
    expect(await publishDraft({ id, expectedVersion: 4 })).toMatchObject({ ok: false, error: 'CONFLICT' });
    expect(dependencies.attest).not.toHaveBeenCalled();
    dependencies.rpc.mockResolvedValue({ data: null, error: { code: '23505' } });
    expect(await saveDraft({ id, expectedVersion: 4, snapshot: snapshot() })).toMatchObject({ ok: false, error: 'CONFLICT' });
  });
  it('rejects missing versions and wraps initialization backend faults as ApiResult', async () => {
    expect(await publishDraft({ id } as never)).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    dependencies.rpc.mockResolvedValue({ data: null, error: { code: 'NETWORK' } });
    expect(await createDraft()).toMatchObject({ ok: false, error: 'UNAVAILABLE' });
  });
  it('revalidates immutable rollback targets and never trusts only a release ID', async () => {
    const value = snapshot(); delete (value.messages as Partial<ContentSnapshot['messages']>).ja;
    dependencies.rpc.mockResolvedValue({ data: { id, snapshot: value }, error: null });
    expect(await rollbackRelease({ releaseId: id })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect(dependencies.attest).not.toHaveBeenCalled();
  });
});

describe('confirmed website image removal', () => {
  const usageKey = Object.keys(fixture.media).find(key => fixture.media[key as keyof typeof fixture.media].kind === 'image')!;
  const releaseId = '60000000-0000-4000-8000-000000000002';
  it('requires administrator access before reading or writing content', async () => {
    const { HttpError } = await import('@/lib/http/result');
    dependencies.requireStaff.mockRejectedValue(new HttpError('FORBIDDEN', 403));
    expect(await removeWebsiteImage({ usageKey, expectedReleaseId: releaseId })).toMatchObject({ ok: false, error: 'FORBIDDEN' });
    expect(dependencies.rpc).not.toHaveBeenCalled();
  });
  it('refuses a stale publication before creating a draft', async () => {
    dependencies.rpc.mockResolvedValue({ data: { releaseId: id, snapshot: snapshot() }, error: null });
    expect(await removeWebsiteImage({ usageKey, expectedReleaseId: releaseId })).toMatchObject({ ok: false, error: 'CONFLICT' });
    expect(dependencies.rpc.mock.calls.map(call => call[0])).toEqual(['get_published_content']);
  });
  it('changes only selected image visibility and publishes through the final database version guard', async () => {
    const original = snapshot(); let saved: ContentSnapshot; let draftId: string;
    dependencies.rpc.mockImplementation(async (name, args) => {
      if (name === 'get_published_content') return { data: { releaseId, snapshot: original }, error: null };
      if (name === 'save_described_content_draft') { saved = args.snapshot; draftId = args.id; return { data: { version: 1 }, error: null }; }
      if (name === 'get_content_draft') return { data: { id: draftId, version: 1, snapshot: saved }, error: null };
      return { data: id, error: null };
    });
    expect(await removeWebsiteImage({ usageKey, expectedReleaseId: releaseId })).toEqual({ ok: true, data: { releaseId: id } });
    const expected = snapshot(); expected.media[usageKey].hidden = true;
    expect(saved!).toEqual(expected); expect(original.media[usageKey].hidden).toBeUndefined();
    expect(dependencies.attest).toHaveBeenCalledWith(expect.objectContaining({ id: draftId!, version: 1, snapshot: expected }));
    expect(dependencies.rpc).toHaveBeenLastCalledWith('publish_media_removal', { draft_id: draftId!, expected_version: 1, expected_release: releaseId, usage_key: usageKey });
  });
  it('rejects video or unknown positions and already removed images', async () => {
    for (const key of ['__proto__', 'unknown', Object.keys(fixture.media).find(key => fixture.media[key as keyof typeof fixture.media].kind === 'video')!]) {
      expect(await removeWebsiteImage({ usageKey: key, expectedReleaseId: releaseId })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    }
    expect(dependencies.rpc).not.toHaveBeenCalled();
    const value = snapshot(); value.media[usageKey].hidden = true;
    dependencies.rpc.mockResolvedValue({ data: { releaseId, snapshot: value }, error: null });
    expect(await removeWebsiteImage({ usageKey, expectedReleaseId: releaseId })).toMatchObject({ ok: false, error: 'CONFLICT' });
  });
});

describe('administrator record deletion', () => {
  beforeEach(() => { dependencies.requireStaff.mockResolvedValue({ userId: id, role: 'admin' }); dependencies.rpc.mockReset(); dependencies.rpc.mockResolvedValue({ data: null, error: null }); });
  it('requires an administrator and sends the displayed draft version', async () => {
    expect(await deleteContentRecord({ kind: 'draft', id, expectedVersion: 7 })).toEqual({ ok: true, data: null });
    expect(dependencies.requireStaff).toHaveBeenLastCalledWith(['admin']);
    expect(dependencies.rpc).toHaveBeenCalledWith('delete_content_record', { record_kind: 'draft', record_id: id, expected_version: 7 });
  });
  it('rejects missing versions and unknown kinds before mutation', async () => {
    expect(await deleteContentRecord({ kind: 'draft', id })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect(await deleteContentRecord({ kind: 'unknown' as 'draft', id })).toMatchObject({ ok: false, error: 'INVALID_INPUT' });
    expect(dependencies.rpc).not.toHaveBeenCalled();
  });
  it('preserves SQL conflicts, permissions and missing-record errors', async () => {
    for (const [code, error] of [['23505', 'CONFLICT'], ['42501', 'FORBIDDEN'], ['P0002', 'NOT_FOUND']]) {
      dependencies.rpc.mockResolvedValueOnce({ data: null, error: { code } });
      expect(await deleteContentRecord({ kind: 'release', id })).toMatchObject({ ok: false, error });
    }
  });
});
