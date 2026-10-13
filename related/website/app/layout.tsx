import type { Metadata } from "next";
import {getLocale} from "next-intl/server";
import "./globals.css";
import "./product-detail-template.css";
import "./navigation.css";
import "./site-typography.css";
import "./mobile.css";
import "./section-spacing.css";
import "./brand-review-20261009.css";
import "./stable-page-backgrounds.css";
import "./cart.css";
import "./site-readable-copy.css";
import {htmlLang, type Locale} from "@/i18n/routing";

export const metadata: Metadata = {
  title: {
    default: "Lumiq Studio — Where Stories Come Alive",
    template: "%s",
  },
  description:
    "Lumiq Studio creates AI-powered story and companion experiences — helping children read and imagine, while giving older adults a gentle presence for conversation, reminders, and connection.",
  openGraph: {
    type: "website",
    siteName: "Lumiq Studio",
  },
  twitter: {
    card: "summary",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as Locale;

  return (
    <html lang={htmlLang[locale] ?? "en"} suppressHydrationWarning>
      <head>
        <link rel="preload" href="/assets/fonts/manrope-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
