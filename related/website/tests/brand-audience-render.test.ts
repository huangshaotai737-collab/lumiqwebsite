import React, {createElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createTranslator} from 'next-intl';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {currentSnapshot} from '@/lib/content/current-snapshot';
import {createContentAdapter} from '@/lib/content/adapter';
import type {Locale} from '@/i18n/routing';

let locale: Locale = 'en';
let snapshot = structuredClone(currentSnapshot);
const translator = (namespace?: string) => createTranslator({locale, messages: snapshot.messages[locale], namespace});

vi.mock('next-intl', async importOriginal => ({
  ...await importOriginal<typeof import('next-intl')>(),
  useTranslations: (namespace: string) => translator(namespace),
  useLocale: () => locale,
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async (namespace: string) => translator(namespace),
  getLocale: async () => locale,
}));
vi.mock('@/lib/content/server-adapter', () => ({readContentAdapter: async () => createContentAdapter(snapshot, locale)}));
vi.mock('@/components/content/useContentAdapter', () => ({useContentAdapter: () => createContentAdapter(snapshot, locale)}));
vi.mock('@/i18n/navigation', () => ({Link: ({children, href, className}: {children: ReactNode; href: string; className?: string}) => createElement('a', {href, className}, children)}));
vi.mock('@/components/home/HomeMotion', () => ({default: ({children}: {children: ReactNode}) => children}));
vi.mock('@/components/home/HomeBackgrounds', () => ({default: () => null}));
vi.mock('@/components/home/HomeGlassProducts', () => ({default: () => null}));
vi.mock('@/components/home/HomeFilms', () => ({default: () => null}));
vi.mock('@/components/home/HomeExperiences', () => ({default: () => null}));
vi.mock('@/components/home/HomeFamily', () => ({default: () => null}));
vi.mock('@/components/home/HomeWaitlist', () => ({default: () => null}));
vi.mock('@/components/home/HomeImage', () => ({default: ({alt}: {alt: string}) => createElement('img', {alt})}));
vi.mock('@/components/content/ContentImage', () => ({default: ({alt}: {alt: string}) => createElement('img', {alt})}));
vi.mock('@/components/cart/AddToCartButton', () => ({default: () => null}));
vi.mock('next/dynamic', () => ({default: () => () => null}));

import Home from '@/app/page';
import HomePreview from '@/components/content/visual/generated/Home';
import ProductsShowcase from '@/components/ProductsShowcase';
import OlaProductPage from '@/components/OlaProductPage';

// The Next build uses the automatic JSX transform; Vitest's plain TS transform
// also needs React in scope while rendering the unmodified page modules.
vi.stubGlobal('React', React);

function visibleText(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

const audience = {
  en: /adults and older adults/i,
  'zh-hant': /成人與長輩/,
  ja: /大人とシニア/,
};
const obsoleteLearning = /learning|learn|curiosity|學習|好奇心|学び|学ぶ/i;

describe('approved audience in the rendered public and editable pages', () => {
  beforeEach(() => { snapshot = structuredClone(currentSnapshot); });

  for (const language of ['en', 'zh-hant', 'ja'] as const) {
    it(`${language}: renders adult Ola copy from the active homepage fields`, async () => {
      locale = language;
      for (const element of [await Home(), createElement(HomePreview)]) {
        const html = renderToStaticMarkup(element);
        const ola = html.match(/<section id="ola"[\s\S]*?<\/section>/)?.[0];
        expect(ola).toBeDefined();
        expect(visibleText(ola!)).toMatch(audience[language]);
        expect(visibleText(ola!)).not.toMatch(obsoleteLearning);
        expect(ola).toContain('href="/products/ola"');
        expect(ola!.match(/class="lh-rhythm-card /g)).toHaveLength(3);
      }
    });

    it(`${language}: includes the three approved audiences in the products introduction`, () => {
      locale = language;
      const html = renderToStaticMarkup(createElement(ProductsShowcase));
      const lead = html.match(/<p class="prod-lead">([\s\S]*?)<\/p>/)?.[1];
      expect(lead).toContain('LumiqTablet');
      expect(lead).toContain('LumiqOla');
      expect(lead).toContain('OlaGo');
      expect(lead).toContain('LumiqOrb');
      expect(lead).toMatch(audience[language]);
      // BR-027 independently requires 15.6-inch in the Orb overview.
      expect(html).toMatch(/15\.6(?:-inch|インチ| 吋)/);
    });

    it(`${language}: keeps Ola's rendered feature labels in the adult context`, () => {
      locale = language;
      const copy = visibleText(renderToStaticMarkup(createElement(OlaProductPage)));
      expect(copy).toMatch(audience[language]);
      expect(copy).not.toMatch(/kid-safe|for kids|built for bedtime|like Alexa|never alone at night|物語と同期/i);
      if (language === 'zh-hant') {
        expect(copy).toContain('白色提示');
        expect(copy).not.toContain('白噪音');
      }
    });
  }

  it('shows saved CMS edits in both homepage renderers without substituting an unused field', async () => {
    locale = 'en';
    const home = snapshot.messages.en.HomeRefresh as Record<string, unknown>;
    home.brandBody = 'Saved editorial introduction';
    home.olaBody = 'Unused alternative introduction';
    const rhythms = home.rhythms as Record<string, Record<string, string>>;
    rhythms.learn.body = 'Saved first rhythm card';
    for (const element of [await Home(), createElement(HomePreview)]) {
      const html = renderToStaticMarkup(element);
      expect(html).toContain('Saved editorial introduction');
      expect(html).toContain('Saved first rhythm card');
      expect(html).not.toContain('Unused alternative introduction');
    }
  });
});
