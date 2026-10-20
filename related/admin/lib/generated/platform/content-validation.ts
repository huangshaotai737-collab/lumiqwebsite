// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
import type { ContentRule, ContentSnapshot, MessageTree, ContentValidationOptions, ContentValidationResult } from './content';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const controlledMediaPrefix = '/api/media/';
function controlledMediaAssetId(value: string): string | null {
  if (!value.startsWith(controlledMediaPrefix)) return null;
  const assetId = value.slice(controlledMediaPrefix.length);
  return uuid.test(assetId) ? assetId : null;
}
const ownObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Reject raw and percent-encoded traversal before URL normalization can hide it. */
export function safeContentUrl(value: string, media: boolean, origins: readonly string[] = []): boolean {
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return false;
  let decoded = value;
  try {
    for (let pass = 0; pass < 3; pass++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch { return false; }
  if (decoded.includes('%') || /[\\\u0000-\u0020\u007f]/.test(decoded) || decoded.split(/[/?#]/).some(segment => segment === '.' || segment === '..')) return false;
  if (value.startsWith('/') && !value.startsWith('//')) {
    if (!media) return true;
    return /^\/assets\/[^?#]+$/.test(decoded) || (value === decoded && controlledMediaAssetId(value) !== null);
  }
  try {
    const url = new URL(value);
    if (url.username || url.password || url.protocol !== 'https:') return false;
    return !media || origins.some(origin => {
      try { const allowed = new URL(origin); return allowed.protocol === 'https:' && allowed.origin === origin && url.origin === origin; } catch { return false; }
    });
  } catch { return false; }
}

/** One pure policy implementation, generated into both independently built apps. */
export function validateContentSnapshot(
  input: unknown,
  fields: readonly ContentRule[],
  signature: (message: string) => string,
  options: ContentValidationOptions = {},
): ContentValidationResult {
  const issues: { path: string; message: string }[] = [];
  const issue = (path: string, message: string) => issues.push({ path, message });
  if (!ownObject(input)) return { ok: false, issues: [{ path: '', message: 'Expected a content snapshot object' }] };
  const expected = new Map(fields.map(field => [field.path, field]));
  const values = new Map<string, unknown>();
  const seen = new Set<object>();
  const walk = (value: unknown, path: string, depth: number) => {
    if (depth > 20 || (value && typeof value === 'object' && seen.has(value))) { issue(path, 'Invalid recursive content'); return; }
    if (value !== null && typeof value === 'object') {
      if (!Array.isArray(value) && !ownObject(value)) { issue(path, 'Expected JSON content'); return; }
      if (/^products\.[^.]+\.price$/.test(path)) {
        values.set(path, value);
        const productId = path.split('.')[1];
        if (!ownObject(value)) issue(path, 'Expected a reference-price object');
        else if (productId === 'ola-go') {
          if (Object.keys(value).sort().join(',') !== 'includedWith,kind' || value.kind !== 'included' || value.includedWith !== 'ola') issue(path, 'Ola Go remains included with Ola');
        } else if (value.kind === 'pending') {
          if (Object.keys(value).join(',') !== 'kind') issue(path, 'Unexpected pending-price fields');
        } else if (value.kind === 'usd') {
          const amount = value.amount;
          const minor = typeof amount === 'number' ? amount * 100 : NaN;
          if (Object.keys(value).sort().join(',') !== 'amount,kind' || typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0 || !Number.isSafeInteger(Math.round(minor)) || Math.abs(minor - Math.round(minor)) > 1e-7) issue(path, 'Expected a nonnegative, minor-safe USD reference amount');
        } else issue(path, 'Unknown reference-price variant');
        return;
      }
      seen.add(value);
      if (path && !expected.has(path)) { issue(path, 'Unexpected content field'); return; }
      if (path) values.set(path, value);
      for (const [key, child] of Object.entries(value)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key) || key.includes('.')) { issue(path, 'Invalid content key'); continue; }
        walk(child, path ? `${path}.${key}` : key, depth + 1);
      }
      seen.delete(value);
    } else values.set(path, value);
  };
  walk(input, '', 0);
  for (const path of values.keys()) if (!expected.has(path)) issue(path, 'Unexpected content field');
  for (const field of fields) {
    const value = values.get(field.path);
    if (!values.has(field.path)) { issue(field.path, 'Required content field'); continue; }
    if (field.type === 'object' || field.type === 'array') {
      if (field.type === 'array' ? !Array.isArray(value) : !ownObject(value)) issue(field.path, `Expected ${field.type}`);
      continue;
    }
    if (field.type === 'assetId') {
      if (value !== null && (typeof value !== 'string' || !uuid.test(value))) issue(field.path, 'Expected a media UUID or null');
      continue;
    }
    if (typeof value !== field.type) { issue(field.path, `Expected ${field.type}`); continue; }
    if ('fixedValue' in field && value !== field.fixedValue) issue(field.path, 'Code-owned identity cannot change');
    if (typeof value === 'number' && (!Number.isFinite(value) || value < 0)) issue(field.path, 'Expected a finite nonnegative number');
    if (typeof value !== 'string') continue;
    if (field.maxLength !== null && value.length > field.maxLength) issue(field.path, `Maximum length is ${field.maxLength}`);
    if (field.icuSignature !== null) {
      try { if (signature(value) !== field.icuSignature) issue(field.path, 'ICU placeholders or rich text tags changed'); }
      catch { issue(field.path, 'Invalid ICU message'); }
    }
    if (/<\/?(?:script|style|iframe|object|embed)\b|(?:javascript|vbscript|data)\s*:/i.test(value)) issue(field.path, 'Unsafe content');
    if (field.path.endsWith('.contentStatus') && !['pending_brand_confirmation', 'confirmed'].includes(value)) issue(field.path, 'Unknown content status');
    if ((field.path.startsWith('media.') && field.path.endsWith('.url')) || /^products\.[^.]+\.image$/.test(field.path)) {
      if (!safeContentUrl(value, true, options.allowedStorageOrigins)) issue(field.path, 'Media URL is not allowed');
    }
    if (field.path === 'settings.siteUrl') {
      if (!safeContentUrl(value, false) || !value.startsWith('https://')) issue(field.path, 'Expected a safe HTTPS site URL');
    }
    if (field.path === 'settings.supportEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) issue(field.path, 'Expected an email address');
  }
  for (const [path, value] of values) {
    if (!/^media\.[^.]+\.url$/.test(path) || typeof value !== 'string') continue;
    const asset = values.get(path.replace(/\.url$/, '.assetId'));
    const controlledAsset = controlledMediaAssetId(value);
    if (controlledAsset !== null) {
      if (typeof asset !== 'string' || controlledAsset !== asset) issue(path, 'Controlled media URL must match its asset UUID');
    } else if (asset !== null) issue(path, 'Asset UUID requires a controlled media URL');
  }
  if (issues.length) return { ok: false, issues };
  const snapshot = input as ContentSnapshot;
  // Read-only compatibility aliases are derived on every parse/validation, never
  // independent public settings. B2 persists this normalized return value and
  // guards canonical settings edits/publish/rollback with admin server + DB checks.
  const messages = { ...snapshot.messages };
  for (const locale of ['en', 'zh-hant', 'ja'] as const) {
    messages[locale] = { ...messages[locale], Contact: { ...(messages[locale].Contact as MessageTree), intro: snapshot.settings.contactText[locale] } };
  }
  return { ok: true, snapshot: { ...snapshot, messages } };
}
