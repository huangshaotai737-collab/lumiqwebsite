import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";

export const SITE_URL = "https://lumiqstudio.com";

export type PageMetadataKey =
  | "home"
  | "story"
  | "products"
  | "productOla"
  | "productOlaGo"
  | "productTablet"
  | "productPrint"
  | "productNest"
  | "plans"
  | "faq"
  | "about"
  | "contact"
  | "prelaunch"
  | "privacy"
  | "terms"
  | "cookies"
  | "childSafety";

const paths: Record<PageMetadataKey, string> = {
  home: "",
  story: "/story",
  products: "/products",
  productOla: "/products/ola",
  productOlaGo: "/products/ola-go",
  productTablet: "/products/tablet",
  productPrint: "/products/print",
  productNest: "/products/nest",
  plans: "/plans",
  faq: "/faq",
  about: "/about",
  contact: "/contact",
  prelaunch: "/prelaunch",
  privacy: "/legal/privacy",
  terms: "/legal/terms",
  cookies: "/legal/cookies",
  childSafety: "/legal/child-safety",
};

export async function pageMetadata(
  key: PageMetadataKey,
  locale?: Locale,
): Promise<Metadata> {
  const activeLocale = locale ?? routing.defaultLocale;
  const namespace = `Metadata.${key}` as const;
  const t = await getTranslations({ locale: activeLocale, namespace });
  const path = paths[key];
  const canonical = `${SITE_URL}/${activeLocale}${path}`;
  const languages = Object.fromEntries(
    routing.locales.map((item) => [item, `${SITE_URL}/${item}${path}`]),
  );

  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages },
    openGraph: {
      type: "website",
      siteName: "Lumiq Studio",
      title: t("title"),
      description: t("description"),
      url: canonical,
      locale:
        activeLocale === "zh-hant"
          ? "zh_TW"
          : activeLocale === "ja"
            ? "ja_JP"
            : "en_US",
    },
    twitter: {
      card: "summary",
      title: t("title"),
      description: t("description"),
    },
    ...(new Set<PageMetadataKey>([
      "privacy",
      "terms",
      "cookies",
      "childSafety",
    ]).has(key)
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

export function localizedMetadata(key: PageMetadataKey) {
  return async ({ params }: { params: Promise<{ locale: Locale }> }) => {
    const { locale } = await params;
    return pageMetadata(key, locale);
  };
}
