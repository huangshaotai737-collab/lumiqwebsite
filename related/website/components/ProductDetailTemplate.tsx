"use client";
import {useTranslations} from "next-intl";
import BrandProductFacts from "@/components/BrandProductFacts";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {useCartCopy} from "@/components/content/useCartCopy";
import {isProductId} from "@/lib/cart";
import Heading from "@/components/Heading";
import AddToCartButton from "@/components/cart/AddToCartButton";


import { type CSSProperties, type ReactNode } from "react";
import Image from "@/components/content/ContentImage";
import { preload } from "react-dom";
import { Link } from "@/i18n/navigation";

import ProductFeatureSection, {type ProductVisual, type ProductIndexItem} from "@/components/ProductFeatureSection";
export type {ProductVisual, ProductIndexItem} from "@/components/ProductFeatureSection";
export type ProductScene = {eyebrow?:string;title:string;body:string;image:ProductVisual;items:ProductIndexItem[]};
type ProductStory = ProductScene;
type ProductSection = {eyebrow?:string;title:string;intro?:string;items:ProductIndexItem[];image?:ProductVisual};

type ProductDetailTemplateProps = {
  slug: string;
  accent: string;
  accentSoft: string;
  backLabel: string;
  productName: string;
  title: string;
  lede: string;
  conceptNotice: string;
  priceLabel: string;
  priceQualifier?: string;
  compactHeroPriceLabel?: boolean;
  ctaLabel: string;
  heroImage: ProductVisual;
  heroOptions?: ReactNode;
  story: ProductStory;
  scenes: ProductScene[];
  features: ProductSection;
  darkSection: ProductSection;
  extraSection?: ProductSection;
  finalTitle: string;
  finalBody: string;
  secondaryAction?: { href: string; label: string };
  afterFeatures?: ReactNode;
  hideDarkSection?: boolean;
  afterFeaturesCount?:number;
  afterContent?:ReactNode;
};

function ProductImage({
  visual,
  sizes,
  priority = false,
}: {
  visual: ProductVisual;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={visual.src}
      alt={visual.alt}
      width={1600}
      height={1200}
      sizes={sizes}
      priority={priority}
      unoptimized={visual.unoptimized}
      style={{
        width: "100%",
        height: "100%",
        objectFit: visual.fit ?? "cover",
        objectPosition: visual.position ?? "center",
      }}
    />
  );
}

export default function ProductDetailTemplate({
  slug,
  accent,
  accentSoft,
  backLabel,
  productName,
  title,
  lede,
  conceptNotice,
  priceLabel,
  priceQualifier,
  compactHeroPriceLabel = false,
  ctaLabel,
  heroImage,
  heroOptions,
  story,
  scenes,
  features,
  darkSection,
  extraSection,
  finalTitle,
  finalBody,
  secondaryAction,
  afterFeatures,
  hideDarkSection = false,
  afterFeaturesCount = 1,
  afterContent,
}: ProductDetailTemplateProps) {
  const cms = useContentAdapter();
  const copy = useCartCopy();
  const prices = useTranslations("BrandPlans");
  const vip = slug === "tablet" || slug === "ola" ? prices(`hardware.${slug}Vip`) : null;
  if (vip) priceQualifier=prices("hardware.msrp");
  if (isProductId(slug)) {
    const product = cms.snapshot.products[slug];
    productName = product.name;
    priceLabel = product.price.kind === "usd" ? `USD ${product.price.amount}` : product.price.kind === "included" || slug === "nest" ? priceLabel : copy.pending;
  }

  preload("/assets/fonts/barlow-condensed-semibold.ttf", {
    as: "font", type: "font/ttf", crossOrigin: "anonymous",
  });
  const style = {
    "--pd-accent": accent,
    "--pd-accent-soft": accentSoft,
  } as CSSProperties;

  return (
    <main className={`product-detail-light pd-${slug}`} style={style}>
      <section
        className="pd-hero-floor"
        data-no-word-reveal=""
      >
        <div className="pd-shell pd-hero-grid">
          <div className="pd-hero-copy">
            <Link href="/products" className="pd-back-link">
              {backLabel}
            </Link>
            <div className="pd-hero-display-title" aria-hidden="true">
              {productName}
            </div>
            <Heading as="h1">
              <span className="pd-product-name">{productName}</span>
              <span className="pd-product-tagline">{title}</span>
            </Heading>
            <p className="pd-hero-lede">{lede}</p>
            <p className="pd-concept-note">{conceptNotice}</p>
            <div className="pd-hero-actions">
              <div className="pd-price-row">
                <p className={`pd-price${compactHeroPriceLabel ? " pd-price--compact" : ""}`}>
                  {priceQualifier && <span className="pd-price-qualifier">{priceQualifier}</span>}
                  {priceLabel}
                  {vip && <span className="pd-vip-price">{prices("hardware.vip")} USD {vip}</span>}
                </p>
                <Link href="/prelaunch" className="pd-primary-action">
                  {ctaLabel}
                </Link>
              </div>
              <div className="pd-cart-action"><AddToCartButton productId={slug} /></div>
            </div>
            {heroOptions && <div className="pd-hero-options">{heroOptions}</div>}
            {(slug === "tablet" || slug === "ola" || slug === "ola-go") && <BrandProductFacts product={slug} />}
          </div>

          <figure className="pd-hero-visual">
            <ProductImage
              visual={heroImage}
              sizes="(max-width: 900px) 100vw, 56vw"
              priority
            />
          </figure>
        </div>
      </section>

      <ProductFeatureSection className="pd-story-floor" {...story} intro={story.body} mediaLeft />
      {scenes.map((scene,index)=><ProductFeatureSection key={scene.title} className="pd-scenes-floor" {...scene} intro={scene.body} mediaLeft={index%2===1} />)}
      <ProductFeatureSection className="pd-feature-floor" {...features} mediaLeft={scenes.length%2===1}/>
      {afterFeatures}
      {!hideDarkSection && <ProductFeatureSection className="pd-dark-floor" {...darkSection} mediaLeft={(scenes.length+3+(afterFeatures?afterFeaturesCount:0))%2===1}/>}
      {extraSection && <ProductFeatureSection className="pd-extra-floor" {...extraSection} mediaLeft={(scenes.length+3+(afterFeatures?afterFeaturesCount:0)+(hideDarkSection?0:1))%2===1}/>}

      <section className="pd-final-floor">
        <div className="pd-shell pd-final-inner">
          <div>
            <p className="pd-eyebrow">{productName}</p>
            <Heading as="h2">{finalTitle}</Heading>
            <p>{finalBody}</p>
          </div>
          <div className={`pd-final-actions${compactHeroPriceLabel ? " is-compact-price" : ""}`}>
            <p className="pd-price">
              {priceQualifier && <span className="pd-price-qualifier">{priceQualifier}</span>}
              {priceLabel}
              {vip && <span className="pd-vip-price">{prices("hardware.vip")} USD {vip}</span>}
            </p>
            <Link href="/prelaunch" className="pd-primary-action">
              {ctaLabel}
            </Link>
            <AddToCartButton productId={slug} />
            {secondaryAction && (
              <Link href={secondaryAction.href} className="pd-secondary-action">
                {secondaryAction.label}
              </Link>
            )}
          </div>
        </div>
      </section>
      {afterContent}
    </main>
  );
}
