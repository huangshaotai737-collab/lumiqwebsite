import { describe, expect, it } from 'vitest';
import { validateDraft } from './schema';
import type { MediaSlot } from '@/lib/generated/platform/content';
import { contentFields } from './fields';
import snapshot from './initial-snapshot.json';

const copy = () => structuredClone(snapshot);

describe('publish validation', () => {
  it('hides retired local-account demo fields while keeping active product slots editable',()=>{expect(contentFields.some(field=>field.path.startsWith('messages.en.Members.'))).toBe(false);expect(contentFields.some(field=>field.path==='messages.en.CmsStatic.field_8bec1f33f31dd9ab')).toBe(true);expect(contentFields.some(field=>field.path==='media.asset_5fa455671b41fc69.url')).toBe(true);});
  it('accepts the complete imported snapshot', () => {
    expect(validateDraft(copy()).ok).toBe(true);
    expect(contentFields.find(field => field.path === 'settings.siteUrl')?.adminOnly).toBe(true);
  });
  it('normalizes readonly contact aliases from the sole canonical public settings source', () => {
    const draft = copy(); draft.settings.contactText.en = 'Canonical contact text';
    draft.messages.en.Contact.intro = 'An alias cannot override the setting';
    const result = validateDraft(draft);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.snapshot.messages.en.Contact).toMatchObject({ intro: 'Canonical contact text' });
    expect(draft.messages.en.Contact.intro).toBe('An alias cannot override the setting');
  });
  it.each(['Contact {', 'Contact {name}', '<strong>Contact us</strong>'])('rejects incompatible canonical contact ICU before deriving aliases: %s', value => {
    for (const locale of ['en', 'zh-hant', 'ja'] as const) {
      const draft = copy(); draft.settings.contactText[locale] = value;
      const result = validateDraft(draft);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.issues.map(issue => issue.path)).toContain(`settings.contactText.${locale}`);
    }
  });
  it.each(['Contact our team', "Contact '{' our team", "It's easy to contact us"])('successful contact normalization is idempotent and revalidates: %s', value => {
    const draft = copy();
    for (const locale of ['en', 'zh-hant', 'ja'] as const) draft.settings.contactText[locale] = value;
    const result = validateDraft(draft);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(validateDraft(result.snapshot)).toEqual(result);
    for (const locale of ['en', 'zh-hant', 'ja'] as const) expect(result.snapshot.messages[locale].Contact).toMatchObject({ intro: value });
  });
  it('invalid_icu_blocks_publish', () => {
    const brokenIcuSnapshot = copy();
    expect(brokenIcuSnapshot.messages.en.Plans.days).toContain('{count}');
    brokenIcuSnapshot.messages.en.Plans.days = brokenIcuSnapshot.messages.en.Plans.days.replace('{count}', '');
    expect(validateDraft(brokenIcuSnapshot).ok).toBe(false);
  });
  it.each(['{count', '{count, plural, one {day}}', '{other} days', '<script>{count}</script>'])('rejects malformed or incompatible ICU: %s', value => {
    const draft = copy(); draft.messages.en.Plans.days = value;
    expect(validateDraft(draft).ok).toBe(false);
  });
  it.each(['javascript:alert(1)', 'data:text/html,test', '//evil.example/image.png', '/assets/../secret.png', 'https://evil.example/a.png', '/assets/%2e%2e/secret.png', '/assets/%252e%252e/secret.png', '/assets/%25252e%25252e/secret.png', '/assets/%2525252e%2525252e/secret.png', '/assets/a%2fb/../../secret.png', '/assets/a%5cb.png', '/assets/a?x=1', 'https://media.example@evil.example/a.png'])('rejects unsafe media URL: %s', value => {
    const draft = copy(); Object.values(draft.media)[0].url = value;
    expect(validateDraft(draft).ok).toBe(false);
  });
  it.each(['/api/media/abc', '/%61pi/media/abc', '/api%2fmedia%2fabc', '/%2561pi/media/abc', '/api/media/a1288990-47a1-4fb0-88e9-271d73596611?x=1'])('rejects malformed or encoded controlled URLs for slots and product images: %s', value => {
    const media = copy(); Object.values(media.media)[0].url = value;
    const product = copy(); product.products.ola.image = value;
    expect(validateDraft(media).ok).toBe(false);
    expect(validateDraft(product).ok).toBe(false);
  });
  it('rejects untracked product image URLs and encoded slot/image prefixes even with matching UUIDs', () => {
    const assetId = 'a1288990-47a1-4fb0-88e9-271d73596611';
    const valid = copy(); valid.products.ola.image = `/api/media/${assetId}`;
    expect(validateDraft(valid).ok).toBe(false);
    for (const value of [`/%61pi/media/${assetId}`, `/api%2fmedia%2f${assetId}`]) {
      const media = copy(); const slot = Object.values(media.media)[0] as MediaSlot; slot.url = value; slot.assetId = assetId;
      const product = copy(); product.products.ola.image = value;
      expect(validateDraft(media).ok).toBe(false);
      expect(validateDraft(product).ok).toBe(false);
    }
  });
  it('storage origins cannot authorize replacing a null-ID legacy slot', () => {
    const draft = copy(); Object.values(draft.media)[0].url = 'https://media.example/storage/v1/object/public/a.png';
    expect(validateDraft(draft).ok).toBe(false);
    expect(validateDraft(draft, { allowedStorageOrigins: ['https://media.example'] }).ok).toBe(false);
    draft.settings.siteUrl = 'https://media.example';
    expect(validateDraft(draft).ok).toBe(false);
  });
  it('rejects mutable slot kinds, malformed product unions, empty arrays and message arrays', () => {
    const kind = copy(); Object.values(kind.media)[0].kind = 'script' as 'image';
    const missing = copy(); missing.products.ola.price = { kind: 'usd' } as never;
    const rows = copy(); rows.plans[0].rows = [];
    const messages = copy(); (messages.messages.en as Record<string, unknown>).Contact = [];
    for (const draft of [kind, missing, rows, messages]) expect(validateDraft(draft).ok).toBe(false);
  });
  it('requires controlled media UUIDs to match the URL', () => {
    const draft = copy(); const slot = Object.values(draft.media)[0] as MediaSlot;
    slot.assetId = 'a1288990-47a1-4fb0-88e9-271d73596611'; slot.url = `/api/media/${slot.assetId}`;
    expect(validateDraft(draft).ok).toBe(true);
    slot.url = '/api/media/a1288990-47a1-4fb0-88e9-271d73596612';
    expect(validateDraft(draft).ok).toBe(false);
  });
  it.each([null, {}, { ...snapshot, schemaVersion: 2 }, { ...snapshot, messages: {} }, { ...snapshot, products: {} }])('rejects incomplete or unknown versions', input => {
    expect(validateDraft(input).ok).toBe(false);
  });
  it('rejects missing translations, arbitrary fields, price coercion and route edits', () => {
    const missing = copy(); delete (missing.messages.ja.Plans as Record<string, unknown>).days;
    const extra = { ...copy(), css: 'body{display:none}' };
    const href = copy(); href.products.nest.href = '/products/orb';
    const price = copy(); price.products.ola.price.amount = -1;
    for (const input of [missing, extra, href, price]) expect(validateDraft(input).ok).toBe(false);
  });
  it('allows supported reference-price variants while preserving Ola Go bundling', () => {
    expect(contentFields.find(field => field.path === 'products.nest.price.kind')?.editable).toBe(true);
    const nest = copy(); nest.products.nest.price = { kind: 'usd', amount: 199.99 } as never;
    expect(validateDraft(nest).ok).toBe(true);
    const ola = copy(); ola.products.ola.price = { kind: 'pending' } as never;
    expect(validateDraft(ola).ok).toBe(true);
    const go = copy(); go.products['ola-go'].price = { kind: 'usd', amount: 1 } as never;
    expect(validateDraft(go).ok).toBe(false);
    for (const amount of [-1, Infinity, NaN, 1.001, Number.MAX_SAFE_INTEGER]) {
      const draft = copy(); draft.products.ola.price.amount = amount;
      expect(validateDraft(draft).ok).toBe(false);
    }
  });
  it('rejects script protocols in public settings and oversized titles with field paths', () => {
    const draft = copy(); draft.settings.siteUrl = 'javascript:alert(1)'; draft.messages.en.Contact.title = 'a'.repeat(81);
    const result = validateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.map(issue => issue.path)).toEqual(expect.arrayContaining(['settings.siteUrl', 'messages.en.Contact.title']));
  });
});
