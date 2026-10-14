"use client";
import Heading from "@/components/Heading";
import AddToCartButton from "@/components/cart/AddToCartButton";


import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import { preload } from "react-dom";
import { Link } from "@/i18n/navigation";

export type ProductVisual = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
  position?: string;
  unoptimized?: boolean;
};

export type ProductIndexItem = {
  eyebrow?: string;
  title: string;
  body: string;
};

export type ProductScene = ProductIndexItem & {
  image: ProductVisual;
  bullets?: string[];
};

type ProductStory = {
  eyebrow: string;
  title: string;
  body: string;
  image: ProductVisual;
  noteTitle?: string;
  noteBody?: string;
  bullets?: string[];
};

type ProductSection = {
  eyebrow?: string;
  title: string;
  intro?: string;
  items: ProductIndexItem[];
  image?: ProductVisual;
};

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
  compactHeroPriceLabel?: boolean;
  ctaLabel: string;
  heroImage: ProductVisual;
  heroOptions?: ReactNode;
  story: ProductStory;
  scenesEyebrow?: string;
  scenesTitle: string;
  scenes: ProductScene[];
  features: ProductSection;
  darkSection: ProductSection;
  extraSection?: ProductSection;
  finalTitle: string;
  finalBody: string;
  secondaryAction?: { href: string; label: string };
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

function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
}) {
  return (
    <header className={`pd-section-heading is-${align}`}>
      {eyebrow && <p className="pd-eyebrow">{eyebrow}</p>}
      <Heading as="h2">{title}</Heading>
      {intro && <p className="pd-section-intro">{intro}</p>}
    </header>
  );
}

function IndexRows({ items }: { items: ProductIndexItem[] }) {
  return (
    <div className="pd-index-list">
      {items.map((item, index) => (
        <article className="pd-index-row" key={`${item.title}-${index}`}>
          <span className="pd-index-number">
            {String(index + 1).padStart(2, "0")}
          </span>
          <div>
            {item.eyebrow && <p className="pd-row-eyebrow">{item.eyebrow}</p>}
            <Heading as="h3">{item.title}</Heading>
            <p>{item.body}</p>
          </div>
        </article>
      ))}
    </div>
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
  compactHeroPriceLabel = false,
  ctaLabel,
  heroImage,
  heroOptions,
  story,
  scenesEyebrow,
  scenesTitle,
  scenes,
  features,
  darkSection,
  extraSection,
  finalTitle,
  finalBody,
  secondaryAction,
}: ProductDetailTemplateProps) {
  preload("/assets/fonts/barlow-condensed-semibold.ttf", {
    as: "font", type: "font/ttf", crossOrigin: "anonymous",
  });
  const heroRef = useRef<HTMLElement>(null);
  const style = {
    "--pd-accent": accent,
    "--pd-accent-soft": accentSoft,
  } as CSSProperties;

  useEffect(() => {
    if (!heroRef.current) return;

    const hero = heroRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => hero.classList.toggle("is-entered", entry.isIntersecting),
      { threshold: 0.25 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [slug]);

  return (
    <main className={`product-detail-light pd-${slug}`} style={style}>
      <section
        ref={heroRef}
        className="pd-hero-floor is-entered"
        data-no-word-reveal=""
      >
        <div className="pd-shell pd-hero-grid">
          <div className="pd-hero-copy">
            <Link href="/products" className="pd-back-link">
              {backLabel}
            </Link>
            <div className="pd-hero-display-title" aria-hidden="true">
              {productName.toUpperCase()}
            </div>
            <Heading as="h1">
              <span className="pd-product-name">{productName}</span>
              <span className="pd-product-tagline">{title}</span>
            </Heading>
            <p className="pd-hero-lede">{lede}</p>
            <p className="pd-concept-note">{conceptNotice}</p>
            <div className="pd-hero-actions">
              <div className="pd-price-row">
                <p className={`pd-price${compactHeroPriceLabel ? " pd-price--compact" : ""}`}>{priceLabel}</p>
                <Link href="/prelaunch" className="pd-primary-action">
                  {ctaLabel}
                </Link>
              </div>
              <div className="pd-cart-action"><AddToCartButton productId={slug} /></div>
            </div>
            {heroOptions && <div className="pd-hero-options">{heroOptions}</div>}
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

      <section className="pd-floor pd-story-floor">
        <div className="pd-shell pd-story-grid">
          <figure className="pd-story-visual">
            <ProductImage
              visual={story.image}
              sizes="(max-width: 900px) 100vw, 58vw"
            />
          </figure>
          <div className="pd-story-copy">
            <SectionHeading
              eyebrow={story.eyebrow}
              title={story.title}
              intro={story.body}
            />
            {story.bullets && (
              <ul className="pd-bullet-list">
                {story.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {story.noteTitle && (
              <aside className="pd-story-note">
                <Heading as="h3">{story.noteTitle}</Heading>
                {story.noteBody && <p>{story.noteBody}</p>}
              </aside>
            )}
          </div>
        </div>
      </section>

      <section className="pd-floor pd-scenes-floor">
        <div className="pd-shell">
          <SectionHeading
            eyebrow={scenesEyebrow}
            title={scenesTitle}
            align="center"
          />
          <div className={`pd-scene-grid is-${Math.min(scenes.length, 3)}`}>
            {scenes.map((scene) => (
              <article className="pd-scene" key={scene.title}>
                <figure>
                  <ProductImage
                    visual={scene.image}
                    sizes={
                      scenes.length > 2
                        ? "(max-width: 900px) 100vw, 33vw"
                        : "(max-width: 900px) 100vw, 50vw"
                    }
                  />
                </figure>
                <div className="pd-scene-copy">
                  {scene.eyebrow && (
                    <p className="pd-row-eyebrow">{scene.eyebrow}</p>
                  )}
                  <Heading as="h3">{scene.title}</Heading>
                  <p>{scene.body}</p>
                  {scene.bullets && (
                    <ul className="pd-bullet-list">
                      {scene.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="pd-floor pd-feature-floor">
        <div className="pd-shell">
          <SectionHeading
            eyebrow={features.eyebrow}
            title={features.title}
            intro={features.intro}
            align="center"
          />
          <div className={`pd-feature-layout${features.image ? " has-image" : ""}`}>
            <IndexRows items={features.items} />
            {features.image && (
              <figure className="pd-feature-visual">
                <ProductImage
                  visual={features.image}
                  sizes="(max-width: 900px) 100vw, 42vw"
                />
              </figure>
            )}
          </div>
        </div>
      </section>

      <section className="pd-floor pd-dark-floor">
        <div className="pd-shell pd-dark-layout">
          <div className="pd-dark-copy">
            <SectionHeading
              eyebrow={darkSection.eyebrow}
              title={darkSection.title}
              intro={darkSection.intro}
            />
            <IndexRows items={darkSection.items} />
          </div>
          {darkSection.image && (
            <figure className="pd-dark-visual">
              <ProductImage
                visual={darkSection.image}
                sizes="(max-width: 900px) 100vw, 45vw"
              />
            </figure>
          )}
        </div>
      </section>

      {extraSection && (
        <section className="pd-floor pd-extra-floor">
          <div className="pd-shell">
            <SectionHeading
              eyebrow={extraSection.eyebrow}
              title={extraSection.title}
              intro={extraSection.intro}
            />
            <div className={`pd-extra-layout${extraSection.image ? " has-image" : ""}`}>
              {extraSection.image && (
                <figure className="pd-extra-visual">
                  <ProductImage
                    visual={extraSection.image}
                    sizes="(max-width: 900px) 100vw, 48vw"
                  />
                </figure>
              )}
              <IndexRows items={extraSection.items} />
            </div>
          </div>
        </section>
      )}

      <section className="pd-final-floor">
        <div className="pd-shell pd-final-inner">
          <div>
            <p className="pd-eyebrow">{productName}</p>
            <Heading as="h2">{finalTitle}</Heading>
            <p>{finalBody}</p>
          </div>
          <div className={`pd-final-actions${compactHeroPriceLabel ? " is-compact-price" : ""}`}>
            <p className="pd-price">{priceLabel}</p>
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
    </main>
  );
}
