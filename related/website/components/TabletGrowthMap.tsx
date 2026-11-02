"use client";

import { useTranslations } from "next-intl";
import ProductFeatureSection from "@/components/ProductFeatureSection";
import {useContentAdapter} from "@/components/content/useContentAdapter";

export default function TabletGrowthMap() {
  const t = useTranslations("BrandTablet");
  const tablet = useTranslations("Tablet");
  const cms = useContentAdapter();

  const presentation = useTranslations("BrandPresentation.tablet");
  const image={src:cms.url("/assets/tablet-detail/original-20260915/tablet-three-quarter-transparent.png"),alt:tablet("deviceAlt"),fit:"contain" as const};
  return <>
    <ProductFeatureSection id="tablet-growth" className="tablet-growth-map" eyebrow={t("growth.eyebrow")} title={t("growth.title")} intro={<>{t("growth.body")}<p>{t("growth.summary")}</p></>}
      items={[1,2,3,4,5,6].map(number=>({eyebrow:t(`growth.skill${number}Label`),title:t(`growth.skill${number}Title`),body:t(`growth.skill${number}Body`)}))} image={image} mediaLeft/>
    <ProductFeatureSection id="tablet-growth-stages" eyebrow={t("growth.stagesEyebrow")} title={t("growth.stagesTitle")} intro={presentation("stagesIntro")}
      items={[1,2,3,4].map(number=>({title:t(`growth.stage${number}Title`),body:t(`growth.stage${number}Age`)}))} image={image}/>
  </>;
}
