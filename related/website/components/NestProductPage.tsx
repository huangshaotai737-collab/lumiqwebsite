"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import Heading from "@/components/Heading";
import Image from "@/components/content/ContentImage";
import { useContentAdapter } from "@/components/content/useContentAdapter";
import { Link } from "@/i18n/navigation";

const featureSections = [
  { key: "recipes", id: "orb-recipes", details: [1, 2, 3, 4] },
  { key: "calendar", id: "orb-calendar", details: [1, 2, 3, 4] },
  { key: "chores", id: "orb-chores", details: [1, 2, 3, 4] },
  { key: "photos", id: "orb-photos", details: [1, 2, 3] },
] as const;

type FeatureKey = (typeof featureSections)[number]["key"];

function FeatureIcon({ feature }: { feature: FeatureKey }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {feature === "recipes" && <><path d="M7 14h18v3a9 9 0 0 1-18 0v-3Z" /><path d="M5 14h22M11 27h10M12 8c-2-2 2-3 0-5M19 8c-2-2 2-3 0-5" /></>}
      {feature === "calendar" && <><rect x="5" y="7" width="22" height="21" rx="3" /><path d="M11 4v6M21 4v6M5 14h22M11 20h1M20 20h1M11 24h1" /></>}
      {feature === "chores" && <><rect x="6" y="5" width="20" height="23" rx="3" /><path d="m11 13 2 2 4-4M11 22h10M20 14h1M11 18h10" /></>}
      {feature === "photos" && <><rect x="4" y="6" width="24" height="21" rx="3" /><circle cx="21" cy="12" r="2" /><path d="m4 22 7-7 7 7 4-4 6 6" /></>}
    </svg>
  );
}

export default function NestProductPage() {
  const cms = useContentAdapter();
  const t = useTranslations("BrandOrb");
  const productName = cms.snapshot.products.nest.name;
  const finishes = [
    {
      id: "oak",
      name: t("finishes.oak"),
      image: cms.url("/assets/web/nest15-oak-angle.webp"),
      front: cms.url("/assets/web/nest15-oak-front.webp"),
      note: t("finishes.oakNote"),
      swatch: "#c79a62",
    },
    {
      id: "walnut",
      name: t("finishes.walnut"),
      image: cms.url("/assets/web/nest15-walnut-angle.webp"),
      front: cms.url("/assets/web/nest15-walnut-front.webp"),
      note: t("finishes.walnutNote"),
      swatch: "#4a2b20",
    },
    {
      id: "black",
      name: t("finishes.black"),
      image: cms.url("/assets/web/nest15-black-angle.webp"),
      front: cms.url("/assets/web/nest15-black-front.webp"),
      note: t("finishes.blackNote"),
      swatch: "#17191d",
    },
  ] as const;
  const [finish, setFinish] = useState<(typeof finishes)[number]["id"]>("oak");
  const selected = finishes.find((item) => item.id === finish) ?? finishes[0];
  const style = { "--pd-accent": "#596f60", "--pd-accent-soft": "#e8eee8" } as CSSProperties;

  return (
    <main className="product-detail-light pd-nest orb-page" style={style}>
      <section className="orb-hero" aria-labelledby="orb-title" data-no-word-reveal="">
        <div className="pd-shell orb-hero-grid">
          <div className="orb-hero-copy">
            <Link href="/products" className="pd-back-link">{t("allProducts")}</Link>
            <p className="orb-eyebrow"><span className="orb-product-name">{productName}</span> · {t("hero.eyebrow")}</p>
            <Heading as="h1" id="orb-title">{t("hero.title")}</Heading>
            <p className="orb-lede">{t("hero.body")}</p>
            <Link href="/prelaunch" className="pd-primary-action">{t("waitlist")}</Link>
          </div>
          <figure className="orb-hero-visual">
            <Image src={selected.image} alt={t("finishes.alt", { name: selected.name, productName })} width={1600} height={1200} sizes="(max-width: 900px) 100vw, 54vw" priority unoptimized />
            <figcaption>{t("conceptLabel")}</figcaption>
          </figure>
        </div>
      </section>

      <section className="orb-overview orb-floor" aria-labelledby="orb-overview-title">
        <div className="pd-shell orb-detail-layout">
          <header className="orb-section-heading">
            <p className="orb-eyebrow">{t("overview.eyebrow")}</p>
            <Heading as="h2" id="orb-overview-title">{t("overview.title")}</Heading>
            <p>{t("overview.body")}</p>
          </header>
          <nav className="orb-overview-grid" aria-label={t("overview.navigation")}>
            {featureSections.map((feature, index) => (
              <a className="orb-overview-card" key={feature.key} href={`#${feature.id}`}>
                <span className="orb-overview-step" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <p className="orb-card-label">{t(`${feature.key}.label`)}</p>
                <Heading as="h3">{t(`${feature.key}.cardTitle`)}</Heading>
                <p className="orb-card-body">{t(`${feature.key}.cardBody`)}</p>
                <span className="orb-card-arrow" aria-hidden="true">↗</span>
              </a>
            ))}
          </nav>
        </div>
      </section>

      {featureSections.map((feature, sectionIndex) => (
        <section className={`orb-detail orb-floor orb-detail--${feature.key}`} id={feature.id} key={feature.key} aria-labelledby={`${feature.id}-title`} tabIndex={-1}>
          <div className="pd-shell orb-detail-layout">
            <header className="orb-section-heading">
              <span className="orb-section-number" aria-hidden="true">{String(sectionIndex + 1).padStart(2, "0")}</span>
              <p className="orb-eyebrow">{t(`${feature.key}.label`)}</p>
              <Heading as="h2" id={`${feature.id}-title`}>{t(`${feature.key}.title`)}</Heading>
              <p>{t(`${feature.key}.body`)}</p>
            </header>
            <div className={`orb-detail-grid${feature.details.length === 3 ? " orb-detail-grid--three" : ""}`}>
              {feature.details.map((number) => (
                <article className="orb-detail-card" key={number}>
                  <span className="orb-detail-step" aria-hidden="true"><FeatureIcon feature={feature.key} /><span>{String(number).padStart(2, "0")}</span></span>
                  <Heading as="h3">{t(`${feature.key}.detail${number}Title`)}</Heading>
                  {feature.key === "photos" && number === 3 && <p className="orb-planned-label">{t("plannedFeature")}</p>}
                  <p className="orb-detail-body">{t(`${feature.key}.detail${number}Body`)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="orb-finishes orb-floor" aria-labelledby="orb-finishes-title">
        <div className="pd-shell">
          <header className="orb-section-heading orb-section-heading--center">
            <p className="orb-eyebrow">{t("finishes.eyebrow")}</p>
            <Heading as="h2" id="orb-finishes-title">{t("finishes.title")}</Heading>
            <p>{t("finishes.body")}</p>
          </header>
          <div className="orb-finish-selection">
            <figure className="orb-finish-visual">
              <Image src={selected.front} alt={t("finishes.alt", { name: selected.name, productName })} width={1600} height={1200} sizes="(max-width: 700px) 100vw, 60vw" />
            </figure>
            <div className="orb-finish-copy">
              <div className="pd-finish-picker orb-finish-picker" role="group" aria-label={t("finishes.choose")}>
                <p aria-live="polite"><strong>{selected.name}</strong></p>
                <div>
                  {finishes.map((item) => (
                    <button key={item.id} type="button" className={item.id === finish ? "is-active" : ""} aria-label={t("finishes.show", { name: item.name })} aria-pressed={item.id === finish} onClick={() => setFinish(item.id)}>
                      <span style={{ background: item.swatch }} />
                    </button>
                  ))}
                </div>
              </div>
              <p className="orb-finish-note">{selected.note}</p>
              <p className="orb-concept-note">{t("conceptLabel")}</p>
            </div>
          </div>
          <div className="orb-home-gallery">
            <figure className="orb-home-gallery-family">
              <Image src={cms.url("/assets/nest-detail/generated/nest-family-kitchen-v2.png")} alt={t("images.familyAlt", { productName })} width={1600} height={1200} sizes="(max-width: 700px) 100vw, 50vw" />
            </figure>
            <figure className="orb-home-gallery-closeup">
              <Image src={cms.url("/assets/nest-detail/generated/nest-routine-closeup-v2.png")} alt={t("images.closeupAlt", { productName })} width={1600} height={1200} sizes="(max-width: 700px) 100vw, 30vw" />
            </figure>
            <figure className="orb-home-gallery-rear">
              <Image src={cms.url("/assets/web/nest15-rear.webp")} alt={t("images.rearAlt", { productName })} width={1600} height={1200} sizes="(max-width: 700px) 100vw, 20vw" />
            </figure>
          </div>
          <p className="orb-gallery-caption">{t("conceptLabel")}</p>
        </div>
      </section>

      <section className="orb-final orb-floor" aria-labelledby="orb-final-title">
        <div className="pd-shell orb-final-inner">
          <p className="orb-eyebrow orb-product-name">{productName}</p>
          <Heading as="h2" id="orb-final-title">{t("final.title")}</Heading>
          <p className="orb-final-body">{t("final.body", { productName })}</p>
          <Link href="/prelaunch" className="pd-primary-action">{t("waitlist")}</Link>
          <p className="orb-concept-note">{t("final.smallPrint")}</p>
        </div>
      </section>
    </main>
  );
}
