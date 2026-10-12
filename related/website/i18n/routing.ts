import {defineRouting} from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "zh-hant", "ja"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const htmlLang: Record<Locale, string> = {
  en: "en",
  "zh-hant": "zh-Hant",
  ja: "ja",
};
