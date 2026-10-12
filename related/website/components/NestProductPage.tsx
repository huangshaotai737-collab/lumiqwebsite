"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";

export default function NestProductPage() {
  const t = useTranslations("Nest");
  const finishes = [
    {
      id: "oak",
      name: t("oak"),
      image: "/assets/web/nest15-oak-angle.webp",
      front: "/assets/web/nest15-oak-front.webp",
      note: t("oakNote"),
      swatch: "#c79a62",
    },
    {
      id: "walnut",
      name: t("walnut"),
      image: "/assets/web/nest15-walnut-angle.webp",
      front: "/assets/web/nest15-walnut-front.webp",
      note: t("walnutNote"),
      swatch: "#4a2b20",
    },
    {
      id: "black",
      name: t("black"),
      image: "/assets/web/nest15-black-angle.webp",
      front: "/assets/web/nest15-black-front.webp",
      note: t("blackNote"),
      swatch: "#17191d",
    },
  ] as const;
  const [finish, setFinish] = useState<(typeof finishes)[number]["id"]>("oak");
  const selected = finishes.find((item) => item.id === finish) ?? finishes[0];

  return (
    <ProductDetailTemplate
      slug="nest"
      accent="#6f8db8"
      accentSoft="#dfe7f1"
      backLabel={t("all")}
      productName="Lumiq Orb"
      title={`${t("give")} ${t("place")}`}
      lede={t("lede")}
      conceptNotice={t("conceptNotice")}
      priceLabel={`15.6 ${t("display")}`}
      compactHeroPriceLabel
      ctaLabel={t("waitlist")}
      heroImage={{
        src: selected.image,
        alt: t("altFinish", { name: selected.name }),
        fit: "contain",
      }}
      heroOptions={
        <div className="pd-finish-picker" aria-label={t("choose")}>
          <p>
            {t("finish")}
            <strong>{selected.name}</strong>
          </p>
          <div>
            {finishes.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === finish ? "is-active" : ""}
                aria-label={t("show", { name: item.name })}
                aria-pressed={item.id === finish}
                onClick={() => setFinish(item.id)}
              >
                <span style={{ background: item.swatch }} />
              </button>
            ))}
          </div>
        </div>
      }
      story={{
        eyebrow: t("shared"),
        title: `${t("less")} ${t("more")}`,
        body: t("sharedBody"),
        image: {
          src: "/assets/nest-detail/generated/nest-family-kitchen-v2.png",
          alt: t("landscapeAlt"),
        },
        bullets: [t("shared1"), t("shared2"), t("shared3")],
      }}
      scenesEyebrow={t("three")}
      scenesTitle={t("home")}
      scenes={finishes.map((item) => ({
        eyebrow: t("finish"),
        title: item.name,
        body: item.note,
        image: {
          src: item.front,
          alt: t("altFinish", { name: item.name }),
          fit: "contain" as const,
        },
      }))}
      features={{
        eyebrow: t("featuresAria"),
        title: t("shared"),
        intro: t("lede"),
        items: [1, 2, 3, 4].map((number) => ({
          title: t(`f${number}Title`),
          body: t(`f${number}Body`),
        })),
        image: {
          src: "/assets/nest-detail/generated/nest-routine-closeup-v2.png",
          alt: t("portraitAlt"),
        },
      }}
      darkSection={{
        eyebrow: t("shared"),
        title: `${t("less")} ${t("more")}`,
        intro: t("sharedBody"),
        items: [1, 2, 3].map((number) => ({
          title: t(`shared${number}`),
          body: t(`f${number}Body`),
        })),
        image: {
          src: "/assets/web/nest15-rear.webp",
          alt: t("portraitAlt"),
          fit: "contain",
        },
      }}
      finalTitle={`${t("give")} ${t("place")}`}
      finalBody={t("lede")}
    />
  );
}
