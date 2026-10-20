import {createContentAdapter} from "@/lib/content/adapter";
import SiteContentProvider from "@/components/content/SiteContentProvider";
import {readSiteContent} from "@/lib/content/preview";
import {headers} from "next/headers";
export const dynamic = "force-dynamic";
import {hasLocale, NextIntlClientProvider} from "next-intl";
import {getMessages, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollWords from "@/components/ScrollWords";
import LocaleDocument from "@/components/LocaleDocument";
import {routing} from "@/i18n/routing";
import CartProvider from "@/components/cart/CartProvider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();
  const snapshot = await readSiteContent();
  const preview = Boolean((await headers()).get("x-lumiq-preview-draft"));

  return (
    <NextIntlClientProvider messages={messages}>
      <SiteContentProvider snapshot={snapshot} preview={preview}>
      <CartProvider>
      <LocaleDocument locale={locale} />
      <div style={createContentAdapter(snapshot,locale,preview).css()} className={`lumiq-root locale-${locale} flex min-h-screen flex-col`}>
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
