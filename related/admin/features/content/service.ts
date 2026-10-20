import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Json } from '@/lib/generated/database';
import type { ApiResult, UUID } from '@/lib/generated/platform/core';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import { createClient } from '@/lib/auth/server';
import { requireStaff } from '@/lib/auth/require-staff';
import { enforceRateLimit } from '@/lib/http/rate-limit';
import { HttpError } from '@/lib/http/result';
import { validateDraft } from './schema';
import { attestSnapshot } from './validation-attestation';
import { prepareReleaseAssets } from '@/features/media/service';
import initialSnapshot from './initial-snapshot.json';

export type FieldIssue = { path: string; message: string };
export type ContentResult<T> = ApiResult<T> & { issues?: FieldIssue[] };
export type ContentDraft = { id: UUID; version: number; status: 'editing' | 'submitted'; snapshot: ContentSnapshot; updatedAt: string };
export type ContentRelease = { id: UUID; draftId: UUID | null; draftVersion: number | null; rollbackOf: UUID | null; createdAt: string };
export type ContentWorkspace = { drafts: Omit<ContentDraft, 'snapshot'>[]; releases: ContentRelease[]; publishedReleaseId: UUID | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class InvalidContent extends HttpError {
  constructor(readonly issues: FieldIssue[]) { super('INVALID_INPUT', 400); }
}
function identity(id: unknown, version?: unknown) {
  if (typeof id !== 'string' || !uuid.test(id) ||
    (version !== undefined && (!Number.isSafeInteger(version) || (version as number) < 0 || (version as number) >= 2147483647)))
    throw new HttpError('INVALID_INPUT', 400);
}
function checked(input: unknown): ContentSnapshot {
  const value = validateDraft(input);
  if (!value.ok) throw new InvalidContent(value.issues);
  return value.snapshot;
}
function sqlError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === '23505' || error.code === '40001') throw new HttpError('CONFLICT', 409);
  if (error.code === '42501') throw new HttpError('FORBIDDEN', 403);
  if (error.code === 'P0002') throw new HttpError('NOT_FOUND', 404);
  if (['22023', '23514', '23502'].includes(error.code || '')) throw new HttpError('INVALID_INPUT', 400);
  throw new HttpError('UNAVAILABLE', 503);
}
async function result<T>(operation: () => Promise<T>): Promise<ContentResult<T>> {
  try { return { ok: true, data: await operation() }; }
  catch (error) {
    const fault = error instanceof HttpError ? error : new HttpError('UNAVAILABLE', 503);
    return { ok: false, error: fault.code, requestId: randomUUID(), ...(error instanceof InvalidContent ? { issues: error.issues } : {}) };
  }
}
async function writer(admin = false) {
  const actor = await requireStaff(admin ? ['admin'] : ['admin', 'editor']);
  await enforceRateLimit('write', actor.userId);
  return actor;
}
function sameSettings(left: ContentSnapshot['settings'], right?: ContentSnapshot['settings']) {
  return Boolean(right && left.siteUrl === right.siteUrl && left.supportEmail === right.supportEmail &&
    ['en', 'zh-hant', 'ja'].every(locale => left.contactText[locale as keyof typeof left.contactText] === right.contactText?.[locale as keyof typeof right.contactText]));
}
export async function saveDraft(input: { id: UUID; expectedVersion: number; snapshot: ContentSnapshot }): Promise<ContentResult<{ id: UUID; version: number }>> {
  return result(async () => {
    const actor = await writer();
    if (!input || input.expectedVersion === undefined) throw new HttpError('INVALID_INPUT', 400);
    identity(input.id, input.expectedVersion);
    const snapshot = checked(input.snapshot);
    const client = await createClient();
    if (actor.role !== 'admin') {
      const current = await client.rpc('get_content_draft', { id: input.id }); sqlError(current.error);
      let baseline = current.data as unknown as { snapshot: ContentSnapshot } | null;
      if (!baseline) { const published = await client.rpc('get_published_content'); sqlError(published.error); baseline = published.data as unknown as typeof baseline; }
      if (!sameSettings(snapshot.settings, baseline?.snapshot?.settings)) throw new HttpError('FORBIDDEN', 403);
    }
    const saved = await client.rpc('save_content_draft', { id: input.id, expected_version: input.expectedVersion, snapshot: snapshot as unknown as Json });
    sqlError(saved.error);
    return saved.data as { id: UUID; version: number };
  });
}
export async function createDraft(): Promise<ContentResult<{ id: UUID; version: number }>> {
 return result(async () => {
  const actor = await requireStaff(['admin', 'editor']);
  const client = await createClient();
  const published = await client.rpc('get_published_content'); sqlError(published.error);
  const current = published.data as unknown as { snapshot: ContentSnapshot } | null;
  if (!current && actor.role !== 'admin') throw new HttpError('FORBIDDEN', 403);
  const saved = await saveDraft({ id: randomUUID(), expectedVersion: 0, snapshot: (current?.snapshot || initialSnapshot) as ContentSnapshot });
  if (!saved.ok) throw new HttpError(saved.error, saved.error === 'FORBIDDEN' ? 403 : 503);
  return saved.data;
 });
}
async function readDraft(id: UUID) {
  const client = await createClient();
  const loaded = await client.rpc('get_content_draft', { id }); sqlError(loaded.error);
  if (!loaded.data) throw new HttpError('NOT_FOUND', 404);
  return { client, draft: loaded.data as unknown as ContentDraft };
}
export async function submitDraft(input: { id: UUID; expectedVersion: number }): Promise<ContentResult<{ id: UUID; version: number }>> {
  return result(async () => {
    await writer(); if (input?.expectedVersion === undefined) throw new HttpError('INVALID_INPUT', 400); identity(input?.id, input?.expectedVersion);
    const { client, draft } = await readDraft(input.id);
    if (draft.version !== input.expectedVersion) throw new HttpError('CONFLICT', 409);
    checked(draft.snapshot);
    const submitted = await client.rpc('submit_content_draft', { id: input.id, expected_version: input.expectedVersion }); sqlError(submitted.error);
    return submitted.data as { id: UUID; version: number };
  });
}
export async function publishDraft(input: { id: UUID; expectedVersion: number }): Promise<ContentResult<{ releaseId: UUID }>> {
  return result(async () => {
    const actor = await writer(true); if (input?.expectedVersion === undefined) throw new HttpError('INVALID_INPUT', 400); identity(input?.id, input?.expectedVersion);
    const { client, draft } = await readDraft(input.id);
    if (draft.version !== input.expectedVersion) throw new HttpError('CONFLICT', 409);
    const snapshot = checked(draft.snapshot);
    await prepareReleaseAssets(input.id, { version: input.expectedVersion, snapshot });
    await attestSnapshot({ kind: 'draft', id: input.id, version: input.expectedVersion, snapshot, actorId: actor.userId });
    const published = await client.rpc('publish_content_draft', { id: input.id, expected_version: input.expectedVersion }); sqlError(published.error);
    return { releaseId: published.data! };
  });
}
export async function rollbackRelease(input: { releaseId: UUID }): Promise<ContentResult<{ releaseId: UUID }>> {
  return result(async () => {
    const actor = await writer(true); identity(input?.releaseId);
    const client = await createClient();
    const target = await client.rpc('get_content_release', { id: input.releaseId }); sqlError(target.error);
    if (!target.data) throw new HttpError('NOT_FOUND', 404);
    const snapshot = checked((target.data as unknown as { snapshot: unknown }).snapshot);
    await attestSnapshot({ kind: 'release', id: input.releaseId, version: 0, snapshot, actorId: actor.userId });
    const rolledBack = await client.rpc('rollback_content_release', { release_id: input.releaseId }); sqlError(rolledBack.error);
    return { releaseId: rolledBack.data! };
  });
}
export async function loadDraft(id: UUID) { await requireStaff(['admin', 'editor']); identity(id); return (await readDraft(id)).draft; }
export async function loadWorkspace(): Promise<ContentWorkspace> {
  await requireStaff(['admin', 'editor']);
  const client = await createClient(); const response = await client.rpc('get_content_workspace'); sqlError(response.error);
  if (!response.data) throw new HttpError('UNAVAILABLE', 503);
  return response.data as unknown as ContentWorkspace;
}
