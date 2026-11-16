import type { MetadataRoute } from "next";
import { htmlLang, routing } from "@/i18n/routing";
import {readPublishedContent} from "@/lib/content/read";
export const dynamic = "force-dynamic";

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = (await readPublishedContent()).snapshot.settings.siteUrl;
  return paths.flatMap((path) => {
    const languages = Object.fromEntries([
      ...routing.locales.map((locale) => [
        htmlLang[locale],
        `${siteUrl}/${locale}${path}`,
      ]),
      ["x-default", `${siteUrl}/${routing.defaultLocale}${path}`],
    ]);

    return routing.locales.map((locale) => ({
      url: `${siteUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
      priority: path === "" ? 1 : path === "/products" ? 0.9 : 0.7,
      alternates: { languages },
    }));
  });
}
