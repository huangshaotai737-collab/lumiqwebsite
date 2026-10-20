import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { createTranslator } from 'next-intl';
import { getCartMessages } from '@/lib/cart-messages';
import { PRODUCT_CATALOG } from '@/lib/products';
import { initialSnapshot } from '@/lib/content/initial-snapshot';
import { parseSnapshot } from '@/lib/content/parse';
import { fieldManifest } from '@/lib/content/inventory';

function leaves(value: unknown, prefix = ''): string[] {
  return value && typeof value === 'object' ? Object.entries(value).flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key)) : [prefix];
}

describe('content import', () => {
  it('initial_snapshot_preserves_site', () => {
    const snapshot = parseSnapshot(initialSnapshot);
    expect(snapshot.products.nest.href).toBe('/products/nest');
    expect(Object.keys(snapshot.products).sort()).toEqual(['nest', 'ola', 'ola-go', 'print', 'tablet']);
    for (const locale of ['en', 'zh-hant', 'ja'] as const) {
      const original = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
      for (const [namespace, values] of Object.entries(original)) expect(snapshot.messages[locale][namespace]).toEqual(values);
      expect(leaves(snapshot.messages[locale])).toEqual(expect.arrayContaining(leaves(original)));
    }
    for (const product of PRODUCT_CATALOG) expect(snapshot.products[product.id]).toEqual(product);
    expect(snapshot.plans[0]).toMatchObject({ group: 'tablet', tiers: ['Free', 'Lite', 'Pro'] });
    expect(snapshot.plans[0].rows[0]).toEqual({ id: 'monthlyFee', labelKey: 'Plans.monthlyFee', values: ['—', '$6.99 yr / $7.99 mo', '$12.99 yr / $14.99 mo'] });
    expect(snapshot.plans[1].rows[3].values).toEqual([false, true, true, true]);
    const rows = (items: [string, (string | boolean)[]][]) => items.map(([id, values]) => ({ id, labelKey: `Plans.${id}`, values }));
    expect(snapshot.plans).toEqual([
      { group: 'tablet', tiers: ['Free', 'Lite', 'Pro'], rows: rows([
        ['monthlyFee', ['—', '$6.99 yr / $7.99 mo', '$12.99 yr / $14.99 mo']], ['freeTrial', ['—', '7 days', '7 days']],
        ['kidProfile', ['1', '1', '3']], ['classicalStory', ['50', 'Unlimited', 'Unlimited']], ['characters', ['—', '1', '3']],
        ['generation', ['—', '2', '5']], ['reimagined', ['—', '—', '5']], ['storyQuest', ['—', '3', '10']],
        ['original', ['—', '3', '10']], ['printAddon', ['$69', '$59', '$49']],
      ]) },
      { group: 'ola', tiers: ['Free', 'Lite', 'Pro', 'Ultra'], rows: rows([
        ['monthlyFee', ['—', '$16.99 yr / $19.99 mo', '$26.99 yr / $29.99 mo', '$35.99 yr / $39.99 mo']],
        ['freeTrial', ['—', '7 days', '7 days', '7 days']], ['character', ['1', '2', '3', '4']],
        ['voice', [false, true, true, true]], ['personality', [false, true, true, true]], ['reminder', [false, true, true, true]],
        ['connect', [true, true, true, true]], ['dayLimit', ['2', '8', '12', '24']],
      ]) },
    ]);
    expect(fieldManifest.hardware.map(item => item.price)).toEqual(['399', '599', '69', null]);
    expect(snapshot.settings).toMatchObject({ siteUrl: 'https://lumiqstudio.com', supportEmail: 'support@lumiqstudio.com' });
  });

  it('inventory covers every snapshot field and required public page with explicit limits', () => {
    const paths = new Set(fieldManifest.fields.filter(field => field.owner === 'snapshot').map(field => field.path));
    expect(leaves(initialSnapshot).every(path => paths.has(path))).toBe(true);
    expect(fieldManifest.pages).toEqual(expect.arrayContaining(['/', '/products', '/products/ola', '/products/ola-go', '/products/tablet', '/products/print', '/products/nest', '/story', '/about', '/contact', '/plans', '/prelaunch', '/members', '/faq', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/child-safety', 'global/navigation', 'global/footer', 'global/metadata']));
    expect(fieldManifest.fields.find(field => field.path === 'messages.en.Metadata.home.title')?.maxLength).toBe(120);
    expect(fieldManifest.fields.find(field => field.path === 'messages.en.Metadata.home.description')?.maxLength).toBe(320);
    expect(fieldManifest.fields.some(field => field.source && field.source?.file === 'app/contact/page.tsx' && field.initialValue === 'hello@lumiqstudio.com')).toBe(true);
    expect(Object.values(initialSnapshot.media).some(slot => slot.url === '/assets/films-20260908/everyday-companion.mp4')).toBe(true);
    for (const field of fieldManifest.fields) {
      expect(field.pages.length).toBeGreaterThan(0);
      expect(field).toHaveProperty('icuSignature');
      expect(field).toHaveProperty('mediaPurpose');
      if (typeof field.initialValue === 'string') expect(field.maxLength).toBeGreaterThanOrEqual(field.initialValue.length);
    }
  });

  it('localized static cart strings and grammar preserve their original formatter behavior', () => {
    for (const locale of ['en', 'zh-hant', 'ja'] as const) {
      const original = getCartMessages(locale);
      const t = createTranslator({ locale, messages: initialSnapshot.messages[locale], namespace: 'CmsStatic' }) as (key: string, values?: Record<string, string | number>) => string;
      for (const [key, value] of Object.entries(original)) {
        if (typeof value === 'string') expect(t(`cart_${key}`)).toBe(value);
      }
      for (const count of [-1, 0, 0.5, 1, 1.2, 2, 10, 101]) {
        expect(t('cart_unpriced', { count })).toBe(original.unpriced(count));
        expect(t('cart_countLabel', { count })).toBe(original.countLabel(count));
      }
      expect(t('cart_added', { name: 'Lumiq Orb' })).toBe(original.added('Lumiq Orb'));
    }
  });

  it('captures dynamic media and original image alt text with unambiguous source locators', () => {
    for (const url of ['/assets/character-20261012/ola-girl-clean-alpha.webm', '/assets/character-20261012/ola-girl-clean-alpha-safari.mov', '/assets/western-scenes-20260908/morning.webp', '/assets/home-premium-20260907/ola-go-halo.webp']) {
      expect(Object.values(initialSnapshot.media).some(slot => slot.url === url)).toBe(true);
    }
    expect(Object.values(initialSnapshot.media).find(slot => slot.url === '/assets/mobile-backgrounds-20260914/ola-go-ui.webp')?.alt).toBe('LUMIQ OLA + Go');
    const strings = fieldManifest.fields.filter(field => field.path.startsWith('messages.en.CmsStatic.') && field.source);
    expect(new Set(strings.map(field => `${field.source?.file}:${field.source?.locator}`)).size).toBe(strings.length);
  });

  it('export check detects stale artifacts and refuses to discard imported fields after adapter changes', () => {
    const fixture = mkdtempSync(path.join(tmpdir(), 'lumiq-content-export-'));
    const app = path.join(fixture, 'related/website');
    const root = path.resolve('../..');
    try {
      const files = [...fieldManifest.sourceFiles, 'scripts/export-initial-content.mjs', 'messages/en.json', 'messages/zh-hant.json', 'messages/ja.json', 'lib/content/initial-snapshot.json', 'lib/content/field-manifest.json'];
      for (const file of files) { mkdirSync(path.dirname(path.join(app, file)), { recursive: true }); cpSync(file, path.join(app, file)); }
      for (const file of ['contracts/content-icu.ts', 'contracts/content-policy.ts', 'related/admin/features/content/field-manifest.json', 'related/admin/tests/fixtures/content-snapshot.json']) {
        mkdirSync(path.dirname(path.join(fixture, file)), { recursive: true }); cpSync(path.join(root, file), path.join(fixture, file));
      }
      mkdirSync(path.join(app, 'public'), { recursive: true });
      symlinkSync(path.resolve('public/assets'), path.join(app, 'public/assets'));
      symlinkSync(path.resolve('node_modules'), path.join(app, 'node_modules'));
      const run = () => spawnSync(process.execPath, [path.join(app, 'scripts/export-initial-content.mjs'), '--check'], { encoding: 'utf8' });
      expect(run().status).toBe(0);
      writeFileSync(path.join(app, 'lib/content/initial-snapshot.json'), '{}');
      const stale = run(); expect(stale.status).toBe(1); expect(stale.stderr).toContain('Stale content export');
      cpSync('lib/content/initial-snapshot.json', path.join(app, 'lib/content/initial-snapshot.json'));
      const contact = path.join(app, 'app/contact/page.tsx');
      writeFileSync(contact, readFileSync(contact, 'utf8').replace('hello@lumiqstudio.com', ''));
      const removed = run(); expect(removed.status).toBe(1); expect(removed.stderr).toContain('Refusing to discard');
    } finally { rmSync(fixture, { recursive: true, force: true }); }
  });

  it('reexport_is_deterministic', () => {
    const paths = ['lib/content/initial-snapshot.json', 'lib/content/field-manifest.json', '../../contracts/content-policy.ts'];
    const before = paths.map(path => readFileSync(path, 'utf8'));
    execFileSync(process.execPath, ['scripts/export-initial-content.mjs']);
    execFileSync(process.execPath, ['scripts/export-initial-content.mjs', '--check']);
    expect(paths.map(path => readFileSync(path, 'utf8'))).toEqual(before);
  });
});
