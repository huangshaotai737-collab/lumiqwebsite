import 'server-only';
import type {ComponentType, ReactNode} from 'react';
import {headers} from 'next/headers';
import {hasLocale, NextIntlClientProvider} from 'next-intl';
import {routing} from '@/i18n/routing';
import {createContentAdapter} from '@/lib/content/adapter';
import {readSiteContent} from '@/lib/content/preview';
import {readPublishedContent} from '@/lib/content/read';
import SiteContentProvider from './SiteContentProvider';
import CartProvider from '@/components/cart/CartProvider';
import LocaleDocument from '@/components/LocaleDocument';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ScrollWords from '@/components/ScrollWords';
import {withBrandContent} from '@/lib/generated/platform/brand-content';

export async function siteRequestLocale() {
  const requested = (await headers()).get('x-next-intl-locale');
  return hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
}

/** Lives in the leaf page, never a retained layout/template. One request supplies
 * the entire visible shell and renderer, including media CSS and cart prices. */
export default async function SiteContentBoundary({children, publishedOnly = false}: {children: ReactNode; publishedOnly?: boolean}) {
  const locale = await siteRequestLocale();
  const snapshot = withBrandContent(publishedOnly ? (await readPublishedContent()).snapshot : await readSiteContent());
  const preview = !publishedOnly && Boolean((await headers()).get('x-lumiq-preview-draft'));
  return (
    <NextIntlClientProvider locale={locale} messages={snapshot.messages[locale]}
      formats={{}} now={new Date()} timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}>

      <SiteContentProvider snapshot={snapshot} preview={preview}>
        <CartProvider>
          <LocaleDocument locale={locale} />
          <div style={createContentAdapter(snapshot, locale, preview).css()} className={`lumiq-root locale-${locale} flex min-h-screen flex-col`}>
            <div className="bg-layer" />
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
            <ScrollWords />
          </div>
        </CartProvider>
      </SiteContentProvider>
    </NextIntlClientProvider>
  );
}

/** Wrap locale route entries; keep the original renderer available for previews. */
export function withSiteContent<Props extends object>(Page: ComponentType<Props>) {
  return async function ContentPage(props: Props) {
    return <SiteContentBoundary><Page {...props} /></SiteContentBoundary>;
  };
}
