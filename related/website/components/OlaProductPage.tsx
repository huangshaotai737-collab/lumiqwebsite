"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";

import { useLocale, useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

const statusCopy = {
  en: {
    price: "Planned · indicative price",
    items: [
      {label: "Confirmed", detail: "Designed for adults and older adults"},
      {label: "In development", detail: "Everyday conversation"},
      {label: "Planned", detail: "Storybook character interaction, reminders and connectivity"},
    ],
  },
  "zh-hant": {
    price: "規劃中 · 參考價格",
    items: [
      {label: "已確認", detail: "面向成人與長輩"},
      {label: "開發中", detail: "日常對話"},
      {label: "規劃中", detail: "故事書角色互動、提醒與連線"},
    ],
  },
  ja: {
    price: "計画中 · 参考価格",
    items: [
      {label: "確認済み", detail: "大人とシニアに向けた製品"},
      {label: "開発中", detail: "日々の会話"},
      {label: "計画中", detail: "絵本のキャラクターとの対話、リマインダー、通信"},
    ],
  },
} as const;

export default function OlaProductPage() {
  const cms = useContentAdapter();
  const t = useTranslations("Pal");
  const locale = useLocale();
  const status = statusCopy[locale as keyof typeof statusCopy] ?? statusCopy.en;

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
      priceLabel="USD 529"
      priceQualifier={status.price}
      statusItems={[...status.items]}
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
        noteTitle: t("synced"),
        noteBody: t("syncedBody"),
      }}
      scenesEyebrow={t("twoLives")}
      scenesTitle={t("everyAge")}
      scenes={[
        {
          eyebrow: t("kids"),
          title: t("kidsTitle"),
          body: t("kidsBody"),
          bullets: [t("kids1"), t("kids2"), t("kids3")],
          image: {
            src: cms.url("/assets/western-scenes-20260908/ola-bedtime-story-v2.webp"),
            alt: t("kidsAlt"),
          },
        },
        {
          eyebrow: t("adults"),
          title: t("adultsTitle"),
          body: t("adultsBody"),
          bullets: [t("adults1"), t("adults2"), t("adults3")],
          image: {
            src: cms.url("/assets/western-scenes-20260908/ola-senior-reminder-v2.webp"),
            alt: t("adultsAlt"),
          },
        },
      ]}
      features={{
        title: t("waysTitle"),
        items: [1, 2, 3].map((number) => ({
          eyebrow: t(`way${number}Pill`),
          title: t(`way${number}Title`),
          body: t(`way${number}Body`),
        })),
        image: {
          src: cms.url("/assets/home-products-refined-20260907/ola-repaired.webp"),
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
          src: cms.url("/assets/ola-detail/original-20260915/ola-high-angle-crop.png"),
          alt: t("deviceAlt"),
          fit: "contain",
        },
      }}
      finalTitle={t("magic")}
      finalBody={t("lede")}
    />
  );
}
