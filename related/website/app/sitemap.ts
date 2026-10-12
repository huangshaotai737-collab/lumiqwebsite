import type { MetadataRoute } from "next";
import { htmlLang, routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/metadata";

const paths = [
  "",
  "/story",
  "/products",
  "/products/ola",
  "/products/ola-go",
  "/products/tablet",
  "/products/print",
  "/products/nest",
  "/plans",
  "/faq",
  "/about",
  "/contact",
  "/prelaunch",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.flatMap((path) => {
    const languages = Object.fromEntries([
      ...routing.locales.map((locale) => [
        htmlLang[locale],
        `${SITE_URL}/${locale}${path}`,
      ]),
      ["x-default", `${SITE_URL}/${routing.defaultLocale}${path}`],
    ]);

    return routing.locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path === "/products" ? 0.9 : 0.7,
      alternates: { languages },
    }));
  });
}
