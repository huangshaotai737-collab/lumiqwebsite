"use client";

import { useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

export default function OlaProductPage() {
  const t = useTranslations("Pal");

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
      priceLabel="USD 599"
      ctaLabel={t("buy")}
      heroImage={{
        src: "/assets/web/ola-hero-front.webp",
        alt: t("deviceAlt"),
        fit: "contain",
        position: "center",
      }}
      story={{
        eyebrow: t("perfect"),
        title: t("magic"),
        body: t("magicBody"),
        image: {
          src: "/assets/western-scenes-20260908/ola-family-kitchen-v2.webp",
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
            src: "/assets/western-scenes-20260908/ola-bedtime-story-v2.webp",
            alt: t("kidsAlt"),
          },
        },
        {
          eyebrow: t("adults"),
          title: t("adultsTitle"),
          body: t("adultsBody"),
          bullets: [t("adults1"), t("adults2"), t("adults3")],
          image: {
            src: "/assets/western-scenes-20260908/ola-senior-reminder-v2.webp",
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
          src: "/assets/home-products-refined-20260907/ola-repaired.webp",
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
          src: "/assets/ola-detail/original-20260915/ola-high-angle-crop.png",
          alt: t("deviceAlt"),
          fit: "contain",
        },
      }}
      finalTitle={t("magic")}
      finalBody={t("lede")}
    />
  );
}
