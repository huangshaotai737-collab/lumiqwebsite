"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";

import { useTranslations } from "next-intl";
import ProductSceneFigure from "@/components/ProductSceneFigure";
import ProductFeatureSection from "@/components/ProductFeatureSection";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

const avatarActions = ["feed", "clean", "exchange"] as const;

export default function OlaGoProductPage() {
  const cms = useContentAdapter();
  const t = useTranslations("OlaGo");
  const brand = useTranslations("BrandOlaGo");
  const details = useTranslations("BrandSceneDetails.olago");
  const presentation = useTranslations("BrandPresentation.olago");

  const scenePath = "/assets/product-scenes-20261103/olago-avatar.webp";
  const avatarScene = {src: cms.url(scenePath), alt: details("avatarAlt")};
  const firstFeatures = ["reminders", "weather", "journal"] as const;
  const connectedFeatures = ["cellular", "location", "safety"] as const;

  return (
    <ProductDetailTemplate
      slug="ola-go"
      accent="#806d5e"
      accentSoft="#e8e0d8"
      backLabel={t("all")}
      productName={cms.snapshot.products["ola-go"].name}
      title={t("title")}
      lede={t("lede")}
      conceptNotice={t("conceptNotice")}
      priceLabel={t("included")}
      compactHeroPriceLabel
      ctaLabel={t("join")}
      heroImage={{
        src: cms.url("/assets/products/lumiq-ola-go.png"),
        alt: t("alt"),
        fit: "contain",
      }}
      story={{
        eyebrow: t("relationshipEyebrow"),
        title: t("relationshipTitle"),
        preserveTitlePunctuation: true,
        body: t("relationshipBody"),
        items: [{title:presentation("stepsTitle"),body:presentation("stepsBody")},{title:t("journalTitle"),body:t("journalBody")},{title:t("remindersTitle"),body:t("remindersBody")}],
        image: {
          src: cms.url("/assets/product-scenes-20261103/olago-home.webp"),
          alt: details("homeAlt"),
          fit: "cover",
          position: "center",
        },
      }}
      scenes={firstFeatures.map((key, index) => ({
        eyebrow: t("scenesTitle"),
        title: t(`${key}Title`),
        body: t(`${key}Body`),
        items:[1,2,3].map(number=>({title:details(`${key}.item${number}Title`),body:details(`${key}.item${number}Body`)})),
        image: {
          src:
            index === 0
              ? cms.url("/assets/product-scenes-20261103/olago-outdoor.webp")
              : index === 1
                ? cms.url("/assets/product-scenes-20261103/olago-weather.webp")
                : cms.url("/assets/product-scenes-20261103/olago-journal.webp"),
          alt: details(index === 0 ? "outdoorAlt" : index === 1 ? "weatherAlt" : "journalAlt"),
        },
      }))}
      features={{
        eyebrow: t("relationshipEyebrow"),
        title: t("connectedTitle"),
        preserveTitlePunctuation: true,
        intro: t("connectedIntro"),
        items: connectedFeatures.map((key) => ({
          title: t(`${key}Title`),
          body: t(`${key}Body`),
        })),
        image: {
          src: cms.url("/assets/product-scenes-20261103/olago-connected.webp"),
          alt: details("connectedAlt"),
          fit: "cover",
        },
      }}
      afterFeatures={<ProductFeatureSection id="olago-avatar" className="olago-avatar-floor" eyebrow={brand("avatar.eyebrow")} title={brand("avatar.title")} intro={brand("avatar.body")}
        items={avatarActions.map(action=>({title:brand(`avatar.${action}Title`),body:brand(`avatar.${action}Body`)}))}
        media={<ProductSceneFigure image={avatarScene} caption={brand("avatar.eyebrow")} />}/>}
      finalTitle={t("closingTitle")}
      finalBody={t("closingBody")}
      secondaryAction={{ href: "/products/ola", label: t("meetOla") }}
    />
  );
}
