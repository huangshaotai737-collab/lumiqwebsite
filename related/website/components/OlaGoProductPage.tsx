"use client";

import { useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

export default function OlaGoProductPage() {
  const t = useTranslations("OlaGo");

  const firstFeatures = ["reminders", "weather", "journal"] as const;
  const connectedFeatures = ["cellular", "location", "safety"] as const;

  return (
    <ProductDetailTemplate
      slug="ola-go"
      accent="#806d5e"
      accentSoft="#e8e0d8"
      backLabel={t("all")}
      productName="Lumiq Ola Go"
      title={t("title")}
      lede={t("lede")}
      conceptNotice={t("conceptNotice")}
      priceLabel={t("included")}
      compactHeroPriceLabel
      ctaLabel={t("join")}
      heroImage={{
        src: "/assets/products/lumiq-ola-go.png",
        alt: t("alt"),
        fit: "contain",
      }}
      story={{
        eyebrow: t("relationshipEyebrow"),
        title: t("relationshipTitle"),
        body: t("relationshipBody"),
        image: {
          src: "/assets/western-scenes-20260908/ola-go-return-home-v3.webp",
          alt: t("alt"),
          fit: "cover",
          position: "center",
        },
      }}
      scenesEyebrow={t("relationshipEyebrow")}
      scenesTitle={t("scenesTitle")}
      scenes={firstFeatures.map((key, index) => ({
        eyebrow: String(index + 1).padStart(2, "0"),
        title: t(`${key}Title`),
        body: t(`${key}Body`),
        image: {
          src:
            index === 0
              ? "/assets/western-scenes-20260908/ola-go-schoolbag-v2.webp"
              : index === 1
                ? "/assets/ola-go-detail/generated/ola-go-weather-walk-v2.png"
                : "/assets/western-scenes-20260908/ola-go-bedside-journal-v3.webp",
          alt: t("alt"),
        },
      }))}
      features={{
        eyebrow: t("relationshipEyebrow"),
        title: t("connectedTitle"),
        intro: t("connectedIntro"),
        items: connectedFeatures.map((key) => ({
          title: t(`${key}Title`),
          body: t(`${key}Body`),
        })),
        image: {
          src: "/assets/ola-go-detail/original-20260915/ola-go-three-quarter.png",
          alt: t("alt"),
          fit: "contain",
        },
      }}
      darkSection={{
        eyebrow: t("relationshipEyebrow"),
        title: t("included"),
        intro: t("conceptNotice"),
        items: firstFeatures.map((key) => ({
          title: t(`${key}Title`),
          body: t(`${key}Body`),
        })),
        image: {
          src: "/assets/products/lumiq-ola-go.png",
          alt: t("alt"),
          fit: "contain",
        },
      }}
      finalTitle={t("closingTitle")}
      finalBody={t("closingBody")}
      secondaryAction={{ href: "/products/ola", label: t("meetOla") }}
    />
  );
}
