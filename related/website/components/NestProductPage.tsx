"use client";

import { useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import Heading from "@/components/Heading";
import OrbDeviceScene from "@/components/OrbDeviceScene";
import {orbProductFocus} from "@/lib/content/product-scene-focus";
import ProductSceneFigure from "@/components/ProductSceneFigure";
import ProductFeatureSection from "@/components/ProductFeatureSection";
import Image from "@/components/content/ContentImage";
import { useContentAdapter } from "@/components/content/useContentAdapter";
import { Link } from "@/i18n/navigation";

const featureSections = [
  { key: "recipes", id: "orb-recipes", details: [1, 2, 3, 4] },
  { key: "calendar", id: "orb-calendar", details: [1, 2, 3, 4] },
  { key: "chores", id: "orb-chores", details: [1, 2, 3, 4] },
  { key: "photos", id: "orb-photos", details: [1, 2, 3] },
] as const;

export default function NestProductPage() {
  const cms = useContentAdapter();
  const t = useTranslations("BrandOrb");
  const update = useTranslations("BrandUpdate");
  const details = useTranslations("BrandSceneDetails.orb");
  const screenshots = {recipes:["cook","recipe"],calendar:["calendar"],chores:["tasks","rewards"],photos:["gallery"]};
  const scenes = {recipes:"kitchen",calendar:"calendar",chores:"chores",photos:"closeup"} as const;
  const screenUrl = (name:string) => name === "rewards" ? cms.slot("asset_3dbef3e285441f46").url : cms.url(`/assets/orb-ui-20261102/${name}.webp`);
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
          </figure>
        </div>
      </section>

      <ProductFeatureSection id="orb-overview" className="orb-overview" eyebrow={t("overview.eyebrow")} title={t("overview.title")} intro={t("overview.body")}
        mediaLeft navigationLabel={t("overview.navigation")}
        items={featureSections.map(feature=>({eyebrow:t(`${feature.key}.label`),title:t(`${feature.key}.cardTitle`),body:t(`${feature.key}.cardBody`),href:`#${feature.id}`}))}
        media={<ProductSceneFigure caption={t("overview.eyebrow")} focus={orbProductFocus.overview}>
          <OrbDeviceScene screen={cms.url("/assets/orb-ui-20261102/calendar.webp")} label={update("screens.calendar")} scene="overview"/>
        </ProductSceneFigure>}/>

      {featureSections.map((feature,sectionIndex)=><ProductFeatureSection key={feature.key} id={feature.id} className={`orb-detail orb-detail--${feature.key}`}
        eyebrow={t(`${feature.key}.label`)} title={t(`${feature.key}.title`)} intro={t(`${feature.key}.body`)} mediaLeft={sectionIndex%2===1}
        items={feature.details.map(number=>({title:t(`${feature.key}.detail${number}Title`),body:t(`${feature.key}.detail${number}Body`)}))}
        media={<ProductSceneFigure caption={t(`${feature.key}.label`)} focus={orbProductFocus[scenes[feature.key]]} detailViews={screenshots[feature.key].map(name=>({label:update(`screens.${name}`),content:<OrbDeviceScene screen={screenUrl(name)} label={update(`screens.${name}`)} scene={scenes[feature.key]}/>}))}>
          <OrbDeviceScene screen={screenUrl(screenshots[feature.key][0])} label={update(`screens.${screenshots[feature.key][0]}`)} scene={scenes[feature.key]}/>
        </ProductSceneFigure>}/>
      )}

      <ProductFeatureSection id="orb-finishes" className="orb-finishes" eyebrow={t("finishes.eyebrow")} title={t("finishes.title")} intro={t("finishes.body")}
        items={finishes.map((item,index)=>({title:item.name,body:`${item.note} ${details(`finish${index+1}Body`)}`}))}
        media={<figure className="orb-finish-product"><Image src={selected.front} alt={t("finishes.alt", {name:selected.name,productName})} width={1200} height={1200} sizes="(max-width: 900px) 100vw, 46vw" unoptimized /></figure>}>
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
      </ProductFeatureSection>
      <section className="orb-final orb-floor" aria-labelledby="orb-final-title">
        <div className="pd-shell orb-final-inner">
          <p className="orb-eyebrow orb-product-name">{productName}</p>
          <Heading as="h2" id="orb-final-title">{t("final.title")}</Heading>
          <p className="orb-final-body">{t("final.body", { productName })}</p>
          <Link href="/prelaunch" className="pd-primary-action">{t("waitlist")}</Link>
        </div>
      </section>
    </main>
  );
}
