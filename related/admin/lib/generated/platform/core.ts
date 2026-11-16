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
  | 'ORDERING_DISABLED'
  | 'TERMS_CHANGED';

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

export type ShippingAddress = {name:string;country:string;region:string;city:string;postalCode:string;line1:string;line2:string;phone:string};
export type Profile = {userId:UUID;displayName:string;locale:Locale;shippingAddress:ShippingAddress|null};

/** Caller-supplied restriction; never an authority or a mutation target. */
export type AccountIdentityBinding = { expectedUserId: UUID };
