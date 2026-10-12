"use client";

import {useEffect} from "react";
import {htmlLang, type Locale} from "@/i18n/routing";

export default function LocaleDocument({locale}: {locale: Locale}) {
  useEffect(() => {
    document.documentElement.lang = htmlLang[locale];
  }, [locale]);

  return null;
}
