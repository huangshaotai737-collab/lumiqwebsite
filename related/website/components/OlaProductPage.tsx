"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";

import { useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

export default function OlaProductPage() {
  const cms = useContentAdapter();
  const t = useTranslations("Pal");
  const presentation = useTranslations("BrandPresentation.ola");

  return (
    <ProductDetailTemplate
      slug="ola"
      accent="#9a7146"
      accentSoft="#eadfce"
      backLabel={t("all")}
      productName="Lumiq Ola"
      title={`${t("titleBefore")} ${t("titleEm")}`}
      lede={t("lede")}
      conceptNotice={t("conceptNotice")}
      priceLabel="USD 899"
      ctaLabel={t("buy")}
      heroImage={{
        src: cms.url("/assets/web/ola-hero-front.webp"),
        alt: t("deviceAlt"),
        fit: "contain",
        position: "center",
      }}
      story={{
        eyebrow: t("perfect"),
        title: t("magic"),
        body: t("magicBody"),
        image: {
          src: cms.url("/assets/western-scenes-20260908/ola-family-kitchen-v2.webp"),
          alt: t("adultsAlt"),
        },
        items: [{title:t("way1Title"),body:t("way1Body")},{title:t("synced"),body:t("syncedBody")},{title:t("st1"),body:t("sb1")}],
      }}
      scenes={[
        {
          eyebrow: t("kids"),
          title: t("everyAge"),
          preserveTitlePunctuation: true,
          body: `${t("kidsBody")} ${t("adultsBody")}`,
          items: [{title:`${t("kids1")} · ${t("kids2")}`,body:`${presentation("daily1")} ${presentation("daily2")}`}, ...["kids3","adults1","adults2","adults3"].map((key,index)=>({title:t(key),body:presentation(`daily${index+3}`)}))],
          image: {
            src: cms.url("/assets/ola-scenes-20261103/adult-senior-companion.webp"),
            alt: t("adultsAlt"),
          },
        },
      ]}
      features={{
        title: t("waysTitle"),
        intro: presentation("featuresIntro"),
        items: [1, 2, 3].map((number) => ({
          title: t(`way${number}Title`),
          body: t(`way${number}Body`),
        })),
        image: {
          src: cms.url("/assets/western-scenes-20260908/ola-senior-reminder-v2.webp"),
          alt: t("deviceAlt"),
          fit: "contain",
        },
      }}
      darkSection={{
        eyebrow: t("strengths"),
        title: t("strengthsTitle"),
        intro: t("strengthsIntro"),
        items: [1, 2, 3, 4, 5].map((number) => ({
          title: t(`st${number}`),
          body: t(`sb${number}`),
        })),
        image: {
          src: cms.url("/assets/western-scenes-20260908/ola-bedtime-story-v2.webp"),
          alt: t("kidsAlt"),
          fit: "contain",
        },
      }}
      finalTitle={t("magic")}
      finalBody={t("lede")}
    />
  );
}
