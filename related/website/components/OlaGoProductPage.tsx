"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";

import { useTranslations } from "next-intl";
import Heading from "@/components/Heading";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

const avatarActions = ["feed", "clean", "exchange"] as const;

export default function OlaGoProductPage() {
  const cms = useContentAdapter();
  const t = useTranslations("OlaGo");
  const brand = useTranslations("BrandOlaGo");

  const firstFeatures = ["reminders", "weather", "journal"] as const;
  const connectedFeatures = ["cellular", "location", "safety"] as const;
  const supportFeatures = ["care", "memo", "sos"] as const;

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
        body: t("relationshipBody"),
        image: {
          src: cms.url("/assets/western-scenes-20260908/ola-go-return-home-v3.webp"),
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
              ? cms.url("/assets/western-scenes-20260908/ola-go-schoolbag-v2.webp")
              : index === 1
                ? cms.url("/assets/ola-go-detail/generated/ola-go-weather-walk-v2.png")
                : cms.url("/assets/western-scenes-20260908/ola-go-bedside-journal-v3.webp"),
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
          src: cms.url("/assets/ola-go-detail/original-20260915/ola-go-three-quarter.png"),
          alt: t("alt"),
          fit: "contain",
        },
      }}
      afterFeatures={
        <section className="pd-floor olago-avatar-floor" aria-labelledby="olago-avatar-title">
          <div className="pd-shell olago-avatar-layout">
            <header className="olago-avatar-heading">
              <p className="pd-eyebrow">{brand("avatar.eyebrow")}</p>
              <Heading as="h2" id="olago-avatar-title">{brand("avatar.title")}</Heading>
              <p>{brand("avatar.body")}</p>
            </header>
            <div className="olago-avatar-grid">
              {avatarActions.map((action, index) => (
                <article className="olago-avatar-card" key={action}>
                  <p className="olago-avatar-step" aria-hidden="true">{String(index + 1).padStart(2, "0")}</p>
                  <Heading as="h3">{brand(`avatar.${action}Title`)}</Heading>
                  <p>{brand(`avatar.${action}Body`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      }
      darkSection={{
        eyebrow: brand("support.eyebrow"),
        title: brand("support.title"),
        intro: brand("support.body"),
        items: supportFeatures.map((key) => ({
          title: brand(`support.${key}Title`),
          body: brand(`support.${key}Body`),
        })),
        image: {
          src: cms.url("/assets/products/lumiq-ola-go.png"),
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
