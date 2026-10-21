// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
import type { Locale, ProductId, UUID } from './core';

export type MessageTree = { [key: string]: string | MessageTree };
export type ProductPresentation = {
  id: ProductId;
  name: string;
  shortName: string;
  category: string;
  href: `/products/${string}`;
  legacyHrefs: readonly string[];
  image: string;
  /** Reference display only. Never determines SKU eligibility, currency or charging. */
  price: { kind: 'usd'; amount: number } | { kind: 'included'; includedWith: 'ola' } | { kind: 'pending' };
  summary: string;
  highlights: readonly string[];
  contentStatus: 'pending_brand_confirmation' | 'confirmed';
};
export type PlanPresentation = {
  group: 'tablet' | 'ola';
  tiers: string[];
  rows: { id: string; labelKey: string; values: (string | boolean)[] }[];
};
export type MediaSlot = { assetId: UUID | null; url: string; alt: string; kind: 'image' | 'video'; profile: string };
export type ContentSnapshot = {
  schemaVersion: 1;
  messages: Record<Locale, MessageTree>;
  products: Record<ProductId, ProductPresentation>;
  media: Record<string, MediaSlot>;
  plans: PlanPresentation[];
  /** Public content only: never an auth redirect allowlist or media fetch authorization. */
  settings: { siteUrl: string; supportEmail: string; contactText: Record<Locale, string> };
};
export type ContentField = {
  path: string;
  pages: string[];
  type: 'string' | 'number' | 'boolean' | 'assetId' | 'object' | 'array';
  maxLength: number | null;
  icuSignature: string | null;
  mediaPurpose: string | null;
  adminOnly: boolean;
  editable: boolean;
  owner: 'snapshot';
  initialValue?: string | number | boolean | null;
  fixedValue?: string | number | boolean | null;
  source?: { file: string; locator: string; expression?: string };
};
export type ContentRule = Pick<ContentField, 'path' | 'type' | 'maxLength' | 'icuSignature' | 'fixedValue'> & {
  /** An additive namespace may be absent in historical releases. If present,
   * every field in that namespace is validated with the current full policy. */
  optionalGroup?: string;
};
export type ContentValidationOptions = { allowedStorageOrigins?: readonly string[] };
export type ContentValidationResult = { ok: true; snapshot: ContentSnapshot } | { ok: false; issues: { path: string; message: string }[] };
