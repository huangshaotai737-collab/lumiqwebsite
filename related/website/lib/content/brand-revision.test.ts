import {describe, expect, it} from 'vitest';
import seed from './initial-snapshot.json';
import {parseSnapshot} from './parse';
import {brandFaqMessages} from '../../../../contracts/brand-faq';
import {applyBrandRevision} from '../../../../contracts/apply-brand-revision';
import {brandContentMessages} from '../../../../contracts/brand-content';
import {withBrandContent} from '../../../../contracts/brand-content';
import {isActiveBrandContentField} from '../../../../contracts/brand-replacements';

describe('brand revision content compatibility', () => {
  it('accepts the approved 17-question FAQ without changing legacy content', () => {
    const input = structuredClone(seed);
    for (const locale of ['en', 'zh-hant', 'ja'] as const) {
      Object.assign(input.messages[locale], {BrandFaq: brandFaqMessages[locale]});
    }
    expect(() => parseSnapshot(input)).not.toThrow();
    expect(Object.keys(brandFaqMessages.en).filter(key => /^q\d+$/.test(key))).toHaveLength(17);
  });
  it('still accepts the exact historical release shape for rollback', () => {
    expect(parseSnapshot(seed)).toEqual(seed);
  });
  it('upgrades the bundled defaults without mutating history or product identities',()=>{
    const before=structuredClone(seed);
    const updated=applyBrandRevision(parseSnapshot(seed));
    expect(updated.conflicts).toEqual([]);
    expect(parseSnapshot(updated.snapshot).products.tablet.name).toBe('LumiqTablet');
    expect(updated.snapshot.products.tablet.href).toBe(seed.products.tablet.href);
    expect(updated.snapshot.products.ola.price).toEqual({kind:'usd',amount:529});
    expect(seed).toEqual(before);
    expect(applyBrandRevision(updated.snapshot).conflicts).toEqual([]);
  });
  it('updates the old official-logo alternative text without replacing custom edits',()=>{
    const input=parseSnapshot(structuredClone(seed));
    expect(applyBrandRevision(input).snapshot.media.asset_e036cbcfe52d5970.alt).toBe('LUMIQ');
    input.media.asset_e036cbcfe52d5970.alt='Custom official logo description';
    expect(applyBrandRevision(input).snapshot.media.asset_e036cbcfe52d5970.alt).toBe('Custom official logo description');
  });
  it('preserves custom CMS edits instead of silently overwriting them',()=>{
    const input=parseSnapshot(seed);
    input.products.tablet.name='Custom tablet';
    const updated=applyBrandRevision(input);
    expect(updated.snapshot.products.tablet.name).toBe('Custom tablet');
    expect(updated.conflicts).toContain('products.tablet.name');
  });
  it('validates all new locales and keeps editable new copy',()=>{
    const updated=applyBrandRevision(parseSnapshot(seed)).snapshot;
    for(const locale of ['en','zh-hant','ja'] as const){
      expect(updated.messages[locale].BrandTablet).toEqual(brandContentMessages[locale].BrandTablet);
      expect(updated.messages[locale].BrandOrb).toEqual(brandContentMessages[locale].BrandOrb);
    }
    (updated.messages.en.BrandFaq as Record<string,string>).a17='My updated answer';
    expect((parseSnapshot(updated).messages.en.BrandFaq as Record<string,string>).a17).toBe('My updated answer');
  });
  it('carries custom legacy copy into replacement fields without exposing dead edit controls',()=>{
    const input=parseSnapshot(seed);
    (input.messages.en.Tablet as Record<string,string>).lede='A saved custom Tablet introduction';
    const display=withBrandContent(input);
    expect((display.messages.en.BrandTablet as Record<string,Record<string,string>>).hero.body).toBe('A saved custom Tablet introduction');
    expect(input.messages.en.BrandTablet).toBeUndefined();
    expect(isActiveBrandContentField('messages.en.Tablet.lede')).toBe(false);
    expect(isActiveBrandContentField('messages.en.BrandTablet.hero.body')).toBe(true);
    expect(isActiveBrandContentField('messages.en.Tablet.conceptNotice')).toBe(true);
    expect(isActiveBrandContentField('messages.en.BrandFaq.q17')).toBe(true);
  });
  it('rejects partial, executable and unknown content in the new namespace', () => {
    const input = structuredClone(seed);
    Object.assign(input.messages.en, {BrandFaq: {...brandFaqMessages.en, a17: '<script>alert(1)</script>'}});
    expect(() => parseSnapshot(input)).toThrow();
    Object.assign(input.messages.en, {BrandFaq: {q1: 'Only one'}});
    expect(() => parseSnapshot(input)).toThrow();
    Object.assign(input.messages.en, {BrandFaq: {...brandFaqMessages.en, arbitrary: 'extra'}});
    expect(() => parseSnapshot(input)).toThrow();
  });
});
