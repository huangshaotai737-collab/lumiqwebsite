"use client";

import { useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

export default function TabletPage() {
  const t = useTranslations("Tablet");

  return (
    <ProductDetailTemplate
      slug="tablet"
      accent="#d86d3d"
      accentSoft="#f2ded2"
      backLabel={t("all")}
      productName="Lumiq Tablet"
      title={`${t("titleBefore")} ${t("titleEm")}`}
      lede={t("lede")}
      conceptNotice={t("conceptNotice")}
      priceLabel="USD 399"
      ctaLabel={t("buy")}
      heroImage={{
        src: "/assets/tablet-detail/original-20260915/tablet-hero-original-transparent.png",
        alt: t("deviceAlt"),
        fit: "contain",
      }}
      story={{
        eyebrow: t("updates"),
        title: t("immersed"),
        body: t("immersedBody"),
        image: {
          src: "/assets/tablet-detail/generated/tablet-reading-lifestyle-v2.png",
          alt: t("way1Title"),
        },
        bullets: [t("spec1"), t("spec2"), t("spec3"), t("spec4")],
      }}
      scenesEyebrow={t("why")}
      scenesTitle={t("whyTitle")}
      scenes={[
        {
          eyebrow: t("passiveTag"),
          title: t("passiveTitle"),
          body: t("passiveBody"),
          image: {
            src: "/assets/tablet-detail/generated/tablet-passive-screen-time-v2.png",
            alt: t("passiveTitle"),
          },
        },
        {
          eyebrow: t("activeTag"),
          title: t("activeTitle"),
          body: t("activeBody"),
          image: {
            src: "/assets/tablet-detail/generated/tablet-active-story-time-back-muted-20261001.png",
            alt: t("activeTitle"),
          },
        },
      ]}
      features={{
        eyebrow: t("spotlights"),
        title: t("waysTitle"),
        intro: t("spotlightsBody"),
        items: [1, 2, 3, 4, 5].map((number) => ({
          eyebrow: t(`way${number}Pill`),
          title: t(`way${number}Title`),
          body: t(`way${number}Body`),
        })),
        image: {
          src: "/assets/tablet-detail/five-ways/imagime-v1.jpg",
          alt: t("way2Title"),
        },
      }}
      darkSection={{
        eyebrow: t("powers"),
        title: t("powersTitle"),
        intro: t("powersBody"),
        items: [1, 2, 3, 4, 5].map((number) => ({
          title: t(`power${number}Title`),
          body: t(`power${number}Body`),
        })),
        image: {
          src: "/assets/tablet-detail/original-20260915/tablet-three-quarter-transparent.png",
          alt: t("deviceAlt"),
          fit: "contain",
        },
      }}
      extraSection={{
        eyebrow: t("parents"),
        title: t("parentsTitle"),
        intro: t("parentsBody"),
        items: [1, 2, 3, 4, 5].map((number) => ({
          title: t(`parent${number}Title`),
          body: t(`parent${number}Body`),
        })),
        image: {
          src: "/assets/western-scenes-20260908/tablet-parent-controls-v2.webp",
          alt: t("parentsTitle"),
        },
      }}
      finalTitle={t("whyTitle")}
      finalBody={t("whyBody")}
    />
  );
}
