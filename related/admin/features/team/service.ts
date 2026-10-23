import 'server-only';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { ApiResult, StaffRole, UUID } from '@/lib/generated/platform/core';
import { createClient, authConfigured } from '@/lib/auth/server';
import { requireStaff } from '@/lib/auth/require-staff';
import { HttpError } from '@/lib/http/result';
import { enforceRateLimit } from '@/lib/http/rate-limit';
import { mailConfigured, sendStaffInvitation } from './mail';
const roles = ['admin', 'editor', 'operations'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateInvite(input: unknown): {
  email: string;
  role: StaffRole;
} {
  const value = input as { email?: unknown; role?: unknown };
  if (
    !value ||
    typeof value.email !== 'string' ||
    !emailPattern.test(value.email.trim()) ||
    value.email.trim().length > 254 ||
    typeof value.role !== 'string' ||
    !roles.includes(value.role)
  )
    throw new HttpError('INVALID_INPUT', 400);
  return {
    email: value.email.trim().toLowerCase(),
    role: value.role as StaffRole,
  };
}
export function validateChange(input: unknown): {
  userId: UUID;
  role: StaffRole;
  active: boolean;
} {
  const value = input as { userId?: unknown; role?: unknown; active?: unknown };
  if (
    !value ||
    typeof value.userId !== 'string' ||
    !uuidPattern.test(value.userId) ||
    typeof value.role !== 'string' ||
    !roles.includes(value.role) ||
    typeof value.active !== 'boolean'
  )
    throw new HttpError('INVALID_INPUT', 400);
  return {
    userId: value.userId,
    role: value.role as StaffRole,
    active: value.active,
  };
}
export function configurationStatus() {
  return {
    authentication: authConfigured(),
    email: mailConfigured(),
    storage: authConfigured(),
    payments: false,
  };
}
export function rpcError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === '42501') throw new HttpError('FORBIDDEN', 403);
  if (error.code === '23505') throw new HttpError('CONFLICT', 409);
  if (
    error.code === '22023' ||
    error.code === '23514' ||
    error.code === '23502'
  )
    throw new HttpError('INVALID_INPUT', 400);
  if (error.code === 'P0002') throw new HttpError('NOT_FOUND', 404);
  throw new HttpError('UNAVAILABLE', 503);
}
async function result<T>(operation: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    const fault =
      error instanceof HttpError ? error : new HttpError('UNAVAILABLE', 503);
    return { ok: false, error: fault.code, requestId: randomUUID() };
  }
}
async function adminWrite() {
  const actor = await requireStaff(['admin']);
  await enforceRateLimit('write', actor.userId);
  return actor;
}
export async function inviteStaff(input: {
  email: string;
  role: StaffRole;
}): Promise<ApiResult<{ inviteId: UUID }>> {
  return result(async () => {
    await adminWrite();
    const valid = validateInvite(input);
    if (!mailConfigured()) throw new HttpError('UNAVAILABLE', 503);
    const origin = process.env.APP_ORIGIN;
    if (!origin || new URL(origin).origin !== origin)
      throw new HttpError('UNAVAILABLE', 503);
    const token = randomBytes(32).toString('base64url');
    const token_digest = createHash('sha256').update(token).digest('hex');
    const client = await createClient();
    const created = await client.rpc('create_staff_invite', {
      email: valid.email,
      role: valid.role,
      token_digest,
    });
    rpcError(created.error);
    const inviteId = created.data!;
    // Fragment stays out of HTTP requests/referrers. Never include it in API responses or audit.
    const link = `${origin}/invite#${new URLSearchParams({ inviteId, token })}`;
    try {
      await sendStaffInvitation(valid.email, link);
    } catch {
      const failed = await client.rpc('mark_staff_invite_delivery', {
        invite_id: inviteId,
        delivered: false,
      });
      rpcError(failed.error);
      throw new HttpError('UNAVAILABLE', 503);
    }
    const sent = await client.rpc('mark_staff_invite_delivery', {
      invite_id: inviteId,
      delivered: true,
    });
    rpcError(sent.error);
    return { inviteId };
  });
}
export async function acceptStaffInvite(input: {
  inviteId: UUID;
  token: string;
}): Promise<ApiResult<null>> {
  return result(async () => {
    const client = await createClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (
      error &&
      ((error.status || 0) >= 500 || error.name === 'AuthRetryableFetchError')
    )
      throw new HttpError('UNAVAILABLE', 503);
    if (error || !user || user.is_anonymous)
      throw new HttpError('UNAUTHENTICATED', 401);
    await enforceRateLimit('write', user.id);
    if (!user.email_confirmed_at) throw new HttpError('FORBIDDEN', 403);
    if (
      !input ||
      !uuidPattern.test(input.inviteId) ||
      typeof input.token !== 'string' ||
      !/^[A-Za-z0-9_-]{43}$/.test(input.token)
    )
      throw new HttpError('INVALID_INPUT', 400);
    const response = await client.rpc('accept_staff_invite', {
      invite_id: input.inviteId,
      token_digest: createHash('sha256').update(input.token).digest('hex'),
    });
    rpcError(response.error);
    return null;
  });
}
export async function changeStaff(input: {
  userId: UUID;
  role: StaffRole;
  active: boolean;
}): Promise<ApiResult<null>> {
  return result(async () => {
    await adminWrite();
    const valid = validateChange(input);
    const client = await createClient();
    const response = await client.rpc('change_staff_membership', {
      user_id: valid.userId,
      role: valid.role,
      active: valid.active,
    });
    rpcError(response.error);
    return null;
  });
}
export function responseFor<T>(value: ApiResult<T>) {
  const statuses = {
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    INVALID_INPUT: 400,
    CONFLICT: 409,
    RATE_LIMITED: 429,
    UNAVAILABLE: 503,
    NOT_FOUND: 404,
    PAYMENTS_NOT_CONFIGURED: 503,
    ORDERING_DISABLED: 409,
    TERMS_CHANGED:409,
  };
  const headers: Record<string, string> = {
    'Cache-Control': 'private, no-store, max-age=0',
  };
  if (!value.ok && value.error === 'RATE_LIMITED')
    headers['Retry-After'] = '60';
  return Response.json(value, {
    status: value.ok ? 200 : statuses[value.error],
    headers,
  });
}
