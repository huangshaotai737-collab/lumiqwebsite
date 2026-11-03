"use client";

import { useTranslations } from "next-intl";
import ProductFeatureSection from "@/components/ProductFeatureSection";
import {useContentAdapter} from "@/components/content/useContentAdapter";

export default function TabletGrowthMap() {
  const t = useTranslations("BrandTablet");
  const tablet = useTranslations("Tablet");
  const cms = useContentAdapter();

  const details = useTranslations("BrandSceneDetails.tablet");
  const presentation = useTranslations("BrandPresentation.tablet");
  const image={src:cms.url("/assets/tablet-detail/generated/tablet-reading-lifestyle-v2.png"),alt:tablet("deviceAlt"),fit:"cover" as const};
  return <>
    <ProductFeatureSection id="tablet-growth" className="tablet-growth-map" eyebrow={t("growth.eyebrow")} title={t("growth.title")} intro={<>{t("growth.body")}<p>{t("growth.summary")}</p></>}
      items={[1,2,3].map(number=>({eyebrow:t(`growth.skill${number}Label`),title:t(`growth.skill${number}Title`),body:t(`growth.skill${number}Body`)}))} image={image} mediaLeft/>
    <ProductFeatureSection id="tablet-growth-social" title={details("secondSkillsTitle")} intro={details("secondSkillsIntro")}
      items={[4,5,6].map(number=>({eyebrow:t(`growth.skill${number}Label`),title:t(`growth.skill${number}Title`),body:t(`growth.skill${number}Body`)}))}
      image={{src:cms.url("/assets/tablet-detail/generated/tablet-active-story-time-back-muted-20261001.png"),alt:tablet("activeTitle"),fit:"cover"}}/>
    <ProductFeatureSection id="tablet-growth-stages" eyebrow={t("growth.stagesEyebrow")} title={t("growth.stagesTitle")} intro={presentation("stagesIntro")}
      items={[1,2,3,4].map(number=>({eyebrow:t(`growth.stage${number}Age`),title:t(`growth.stage${number}Title`),body:details(`stage${number}Body`)}))}
      image={{src:cms.url("/assets/tablet-detail/generated/tablet-family-new-scene-20261026.png"),alt:tablet("activeTitle"),fit:"cover"}} mediaLeft/>
  </>;
}
