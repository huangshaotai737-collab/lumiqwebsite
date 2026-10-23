"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";

import { useTranslations } from "next-intl";
import ProductDetailTemplate from "@/components/ProductDetailTemplate";
import TabletGrowthMap from "@/components/TabletGrowthMap";
import {Link} from '@/i18n/navigation';
import "@/app/brand-tablet.css";

export default function TabletPage() {
  const cms = useContentAdapter();
  const t = useTranslations("Tablet");
  const brand = useTranslations("BrandTablet");
  const faq = useTranslations("BrandFaq");

  return (
    <ProductDetailTemplate
      slug="tablet"
      accent="#d86d3d"
      accentSoft="#f2ded2"
      backLabel={t("all")}
      productName={brand("hero.eyebrow")}
      title={brand("hero.title")}
      lede={brand("hero.body")}
      conceptNotice={t("conceptNotice")}
      priceLabel="USD 399"
      ctaLabel={t("buy")}
      heroImage={{
        src: cms.url("/assets/tablet-detail/original-20260915/tablet-hero-original-transparent.png"),
        alt: t("deviceAlt"),
        fit: "contain",
      }}
      story={{
        eyebrow: t("updates"),
        title: t("immersed"),
        body: t("immersedBody"),
        image: {
          src: cms.url("/assets/tablet-detail/generated/tablet-reading-lifestyle-v2.png"),
          alt: brand("stories.story1Title"),
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
            src: cms.url("/assets/tablet-detail/generated/tablet-passive-screen-time-v2.png"),
            alt: t("passiveTitle"),
          },
        },
        {
          eyebrow: t("activeTag"),
          title: t("activeTitle"),
          body: t("activeBody"),
          image: {
            src: cms.url("/assets/tablet-detail/generated/tablet-active-story-time-back-muted-20261001.png"),
            alt: t("activeTitle"),
          },
        },
      ]}
      features={{
        eyebrow: brand("stories.eyebrow"),
        title: brand("stories.title"),
        intro: brand("stories.body"),
        items: [1, 2, 3, 4].map((number) => ({
          eyebrow: brand(`stories.story${number}Eyebrow`),
          title: brand(`stories.story${number}Title`),
          body: brand(`stories.story${number}Body`),
        })),
        image: {
          src: cms.url("/assets/tablet-detail/five-ways/imagime-v1.jpg"),
          alt: brand("stories.story2Title"),
        },
      }}
      afterFeatures={<>
        <nav className="tablet-faq-links">
          <Link href="/faq#faq-question-9">{faq("q10")} <span aria-hidden="true">↗</span></Link>
          <Link href="/faq#faq-question-11">{faq("q12")} <span aria-hidden="true">↗</span></Link>
        </nav>
        <aside className="tablet-data-note" aria-labelledby="tablet-data-title">
          <h3 id="tablet-data-title">{brand('privacy.title')}</h3>
          <p>{brand('privacy.body')}</p>
          <Link href="/legal/privacy">{brand('privacy.link')}</Link>
        </aside>
        <TabletGrowthMap />
      </>}
      hideDarkSection
      darkSection={{
        eyebrow: t("powers"),
        title: t("powersTitle"),
        intro: t("powersBody"),
        items: [1, 2, 3, 4, 5].map((number) => ({
          title: t(`power${number}Title`),
          body: t(`power${number}Body`),
        })),
        image: {
          src: cms.url("/assets/tablet-detail/original-20260915/tablet-three-quarter-transparent.png"),
          alt: t("deviceAlt"),
          fit: "contain",
        },
      }}
      extraSection={{
        eyebrow: brand("parents.eyebrow"),
        title: brand("parents.title"),
        intro: brand("parents.body"),
        items: [1, 2, 3, 4, 5].map((number) => ({
          title: brand(`parents.item${number}Title`),
          body: brand(`parents.item${number}Body`),
        })),
        image: {
          src: cms.url("/assets/western-scenes-20260908/tablet-parent-controls-v2.webp"),
          alt: brand("parents.title"),
        },
      }}
      finalTitle={t("whyTitle")}
      finalBody={t("whyBody")}
    />
  );
}
