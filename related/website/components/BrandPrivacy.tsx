"use client";
import {useTranslations} from "next-intl";
export default function BrandPrivacy(){
 const t=useTranslations("BrandUpdate");
 return <section id="family-data" className="brand-family-data"><h2 id="family-data-title">{t("privacy.title")}</h2><p>{t("privacy.p1")}</p><p>{t("privacy.p2")}</p><a href="mailto:support@lumiq.studio">support@lumiq.studio</a></section>;
}
