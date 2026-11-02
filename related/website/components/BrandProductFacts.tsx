"use client";
import {useTranslations} from "next-intl";
export default function BrandProductFacts({product}:{product:"tablet"|"ola"|"ola-go"}) {
  const t=useTranslations("BrandUpdate");
  return <div className="brand-product-facts" role="note" aria-label={t("usageTitle")}>
    <p className="brand-product-facts-label">{t("usageTitle")}</p><p>{t("languages")}</p><p>{t(`offline.${product}`)}</p>
  </div>;
}
