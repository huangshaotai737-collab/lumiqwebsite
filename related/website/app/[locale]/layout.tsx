import {hasLocale, NextIntlClientProvider} from "next-intl";
import {getMessages, setRequestLocale} from "next-intl/server";
import {notFound} from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollWords from "@/components/ScrollWords";
import HomeBackgrounds from "@/components/home/HomeBackgrounds";
import LocaleDocument from "@/components/LocaleDocument";
import {routing} from "@/i18n/routing";

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

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleDocument locale={locale} />
      <div data-site-flow className={`lumiq-root locale-${locale} flex min-h-screen flex-col`}>
        <div className="bg-layer" />
        <HomeBackgrounds />
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <ScrollWords />
      </div>
    </NextIntlClientProvider>
  );
}
