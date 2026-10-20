// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
export type UUID = string;
export type Locale = 'en' | 'zh-hant' | 'ja';
export type ProductId = 'ola' | 'ola-go' | 'tablet' | 'print' | 'nest';
export type StaffRole = 'admin' | 'editor' | 'operations';

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type PlatformError =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UNAVAILABLE'
  | 'NOT_FOUND'
  | 'PAYMENTS_NOT_CONFIGURED'
  | 'ORDERING_DISABLED';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: PlatformError; requestId: string };

export type AuditSummary = {
  id: UUID;
  actorId: UUID | null;
  action: string;
  entityType: string;
  entityId: UUID;
  createdAt: string;
};
