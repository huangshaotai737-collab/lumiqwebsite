import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from './initial-snapshot.json';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import { createDraft, saveDraft, publishDraft, rollbackRelease } from './service';
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
const snapshot = () => structuredClone(fixture) as ContentSnapshot;
beforeEach(() => {
  vi.resetAllMocks();
  dependencies.requireStaff.mockResolvedValue({ userId: id, role: 'admin' });
  dependencies.rpc.mockResolvedValue({ data: { id, version: 1 }, error: null });
});
describe('server content boundary', () => {
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
