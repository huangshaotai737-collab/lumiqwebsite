import {readContentAdapter} from "@/lib/content/server-adapter";
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
import "./mobile-experience.css";
import "./mobile-polish.css";
import "./reduced-motion-layout.css";
import "./mobile-visual-refinement.css";
import {htmlLang, type Locale} from "@/i18n/routing";

export async function generateMetadata() {
  const cms = await readContentAdapter();
  return {
  title: {
    default: cms.text("field_e635317a912dfef3"),
    template: "%s",
  },
  description:
    cms.text("field_e1113eff51ca8f33"),
  openGraph: {
    type: "website",
    siteName: cms.text("field_7d0c1e9cd75db1e9"),
  },
  twitter: {
    card: "summary",
  },
};
}

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
