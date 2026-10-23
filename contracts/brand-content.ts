import type {ContentSnapshot, MessageTree} from './content';
import {brandFaqMessages} from './brand-faq';
import {brandTabletMessages} from './brand-tablet';
import {brandOrbMessages} from './brand-orb';
import {brandPlansMessages} from './brand-plans';
import {brandOlaGoMessages} from './brand-olago';
import {brandProductsMessages} from './brand-products';
import {brandContentReplacements} from './brand-replacements';
import {brandFooterMessages} from './brand-footer';

/** Additive copy only. Historical releases and their signed snapshots stay intact. */
export const brandContentMessages = {
  en: {BrandFaq:brandFaqMessages.en, BrandTablet:brandTabletMessages.en, BrandOrb:brandOrbMessages.en, BrandPlans:brandPlansMessages.en, BrandOlaGo:brandOlaGoMessages.en, BrandProducts:brandProductsMessages.en, BrandFooter:brandFooterMessages.en},
  'zh-hant': {BrandFaq:brandFaqMessages['zh-hant'], BrandTablet:brandTabletMessages['zh-hant'], BrandOrb:brandOrbMessages['zh-hant'], BrandPlans:brandPlansMessages['zh-hant'], BrandOlaGo:brandOlaGoMessages['zh-hant'], BrandProducts:brandProductsMessages['zh-hant'], BrandFooter:brandFooterMessages['zh-hant']},
  ja: {BrandFaq:brandFaqMessages.ja, BrandTablet:brandTabletMessages.ja, BrandOrb:brandOrbMessages.ja, BrandPlans:brandPlansMessages.ja, BrandOlaGo:brandOlaGoMessages.ja, BrandProducts:brandProductsMessages.ja, BrandFooter:brandFooterMessages.ja},
};

/** Renderer/editor defaults for newly introduced namespaces, never overrides
 * saved copy and never mutates the input or a historical release in storage. */
export function withBrandContent(snapshot:ContentSnapshot):ContentSnapshot {
  const messages={...snapshot.messages};
  for(const locale of ['en','zh-hant','ja'] as const) {
    messages[locale]={...structuredClone(brandContentMessages[locale]) as Record<string,MessageTree>,...snapshot.messages[locale]};
  }
  const result={...snapshot,messages};
  for(const replacement of brandContentReplacements) {
    const [,locale,namespace,...keys]=replacement.pathTo.split('.');
    const language=locale as keyof typeof messages;
    // An explicitly saved namespace owns every field, including intentional blanks.
    if(Object.hasOwn(snapshot.messages[language],namespace))continue;
    const value=replacement.pathFrom.split('.').reduce<unknown>((node,key)=>node&&typeof node==='object'?(node as Record<string,unknown>)[key]:undefined,snapshot);
    if(typeof value!=='string'||value===replacement.original||value===replacement.approvedLegacy)continue;
    const leaf=keys.pop()!;
    const parent=keys.reduce<unknown>((node,key)=>(node as Record<string,unknown>)[key],messages[language][namespace]);
    (parent as Record<string,unknown>)[leaf]=value;
  }
  return result;
}
