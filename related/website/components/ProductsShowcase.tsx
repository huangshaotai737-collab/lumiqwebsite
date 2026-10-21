"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import Heading from "@/components/Heading";


import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import Image from "@/components/content/ContentImage";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Box,
  Cpu,
  GraduationCap,
  Lock,
  RotateCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { CarouselInput } from "@/lib/carousel-input";
import {usePhoneLayout} from "@/components/home/usePhoneLayout";

const GlassCardMaterial = dynamic(() => import("./GlassCardMaterial"), {ssr: false});

export default function ProductsShowcase() {
  const cms = useContentAdapter();
  const t = useTranslations("Products");
  const brand = useTranslations("BrandProducts");
  const isPhone = usePhoneLayout();
  const rootRef = useRef<HTMLElement>(null);
  const heroMediaRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [carouselInput] = useState(() => new CarouselInput());
  const pointerOverCardRef = useRef(false);
  const [active, setActive] = useState(0);
  const [stageFullyVisible, setStageFullyVisible] = useState(false);
  const products = [
    {
      id: "pal",
      href: cms.snapshot.products.ola.href,
      img: cms.snapshot.products.ola.image,
      tag: cms.text("field_a9b1ebd2f71c2296"),
      name: cms.value("products.ola.name"),
      copyIndex: 3,
    },
    {
      id: "ola-go",
      href: cms.snapshot.products["ola-go"].href,
      img: cms.snapshot.products["ola-go"].image,
      tag: cms.text("field_38dba8e1bc5cd39b"),
      name: cms.value("products.ola-go.name"),
      copyIndex: 4,
    },
    {
      id: "tablet",
      href: cms.snapshot.products.tablet.href,
      img: cms.snapshot.products.tablet.image,
      tag: cms.text("field_b3c03beee11b8ce9"),
      name: cms.value("products.tablet.name"),
      copyIndex: 1,
    },
    {
      id: "book",
      href: cms.snapshot.products.print.href,
      img: cms.snapshot.products.print.image,
      tag: cms.text("field_73edd4defecf3c29"),
      name: cms.value("products.print.name"),
      copyIndex: 2,
    },
    {
      id: "nest",
      href: cms.snapshot.products.nest.href,
      img: cms.snapshot.products.nest.image,
      tag: cms.text("field_b4d4550ae11151e4"),
      name: cms.value("products.nest.name"),
      copyIndex: 5,
    },
  ].map(({ copyIndex, ...product }) => ({
    ...product,
    pill: t(`p${copyIndex}Pill`),
    sub: t(`p${copyIndex}Sub`),
    desc: t(`p${copyIndex}Desc`),
    specs: [1, 2, 3, 4].map((n) => t(`p${copyIndex}S${n}`)),
  }));
  const features = [Cpu, Box, GraduationCap, ShieldCheck].map(
    (Icon, index) => ({
      Icon,
      title: t(`f${index + 1}Title`),
      sub: t(`f${index + 1}Sub`),
    }),
  );
  const promises = [
    {Icon:Truck,title:brand('shippingTitle'),sub:brand('shippingBody')},
    {Icon:RotateCcw,title:brand('returnsTitle'),sub:brand('returnsBody')},
    {Icon:BadgeCheck,title:t('pr3Title'),sub:brand('warrantyBody')},
    {Icon:Lock,title:brand('waitlistTitle'),sub:brand('waitlistBody')},
  ];

  useEffect(() => {
    if (!rootRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    rootRef.current
      .querySelectorAll(".reveal")
      .forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const nav = document.querySelector<HTMLElement>(".site-nav");
    let frame = 0;
    const updateStageVisibility = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const rect = stage.getBoundingClientRect();
        const navBottom = nav?.getBoundingClientRect().bottom ?? 0;
        const tolerance = 2;
        const availableHeight = window.innerHeight - navBottom;
        const fitsBelowNav = rect.height <= availableHeight + tolerance;
        const fullyVisible = fitsBelowNav
          ? rect.top >= navBottom - tolerance &&
            rect.bottom <= window.innerHeight + tolerance
          : rect.top <= navBottom + tolerance &&
            rect.bottom >= window.innerHeight - tolerance;
        setStageFullyVisible((current) =>
          current === fullyVisible ? current : fullyVisible,
        );
      });
    };
    const resizeObserver = new ResizeObserver(updateStageVisibility);
    resizeObserver.observe(stage);
    if (nav) resizeObserver.observe(nav);
    window.addEventListener("scroll", updateStageVisibility, { passive: true });
    window.addEventListener("resize", updateStageVisibility);
    updateStageVisibility();
    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("scroll", updateStageVisibility);
      window.removeEventListener("resize", updateStageVisibility);
    };
  }, []);

  useEffect(() => {
    const carousel = stageRef.current;
    if (!carousel) return;
    const nav = document.querySelector<HTMLElement>(".site-nav");
    const onPointerMove = (event: PointerEvent) => {
      const card = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".prod-slide");
      pointerOverCardRef.current = Boolean(card && carousel.contains(card) &&
        (card.dataset.slot === "center" || card.dataset.slot === "previous" || card.dataset.slot === "next"));
    };
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (!pointerOverCardRef.current) return;
      const target = event.target instanceof Element
        ? event.target.closest<HTMLElement>(".prod-slide")
        : null;
      if (!target || !carousel.contains(target)) return;
      const slot = target.dataset.slot;
      if (slot !== "center" && slot !== "previous" && slot !== "next") return;

      const rect = carousel.getBoundingClientRect();
      const navBottom = nav?.getBoundingClientRect().bottom ?? 0;
      const tolerance = 2;
      const availableHeight = window.innerHeight - navBottom;
      const isFullyVisible = rect.height <= availableHeight + tolerance
        ? rect.top >= navBottom - tolerance && rect.bottom <= window.innerHeight + tolerance
        : rect.top <= navBottom + tolerance && rect.bottom >= window.innerHeight - tolerance;
      if (!isFullyVisible) return;

      const delta = event.deltaX;
      if (!delta) return;
      event.preventDefault();

      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const direction = carouselInput.wheel(delta * unit, event.timeStamp, performance.now());
      if (!direction) return;
      setActive((currentIndex) => (currentIndex + direction + products.length) % products.length);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    let start: {x: number; y: number; id: number} | null = null;
    let suppressClickUntil = 0;
    const onDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      const target = event.target as Element;
      if (!target.closest('.prod-slide') || target.closest('button,a')) return;
      start = {x: event.clientX, y: event.clientY, id: event.pointerId};
    };
    const onUp = (event: PointerEvent) => {
      if (!start || event.pointerId !== start.id) return;
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 48 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;
      suppressClickUntil = performance.now() + 400;
      if (!carouselInput.navigate(performance.now())) return;
      setActive(index => (index + (dx < 0 ? 1 : -1) + products.length) % products.length);
    };
    const onCancel = () => { start = null; };
    const onClick = (event: MouseEvent) => {
      if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
    };
    carousel.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    carousel.addEventListener('click', onClick, true);
    carousel.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      carousel.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      carousel.removeEventListener('click', onClick, true);
      carousel.removeEventListener("wheel", onWheel, true);
    };
  }, [products.length, carouselInput]);

  const onHeroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = heroMediaRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--px", `${(x * 16).toFixed(1)}px`);
    el.style.setProperty("--py", `${(y * 12).toFixed(1)}px`);
  };

  const onHeroLeave = () => {
    const el = heroMediaRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0px");
    el.style.setProperty("--py", "0px");
  };


  const selectProduct = (index: number) => {
    if (index === active || (!isPhone && !carouselInput.navigate(performance.now()))) return;
    setActive((index + products.length) % products.length);
  };

  const stepProduct = (direction: 1 | -1) => {
    if (!isPhone && !carouselInput.navigate(performance.now())) return;
    setActive((currentIndex) =>
      (currentIndex + direction + products.length) % products.length,
    );
  };

  return (
    <main ref={rootRef} className="prod-page editorial-page">
      {/* Announcement bar */}
      <div className="prod-topbar" role="note">
        <div className="prod-topbar-inner">
          <span>{brand('preview')}</span>
        </div>
      </div>

      {/* Hero */}
      <section className="container prod-hero">
        <div className="prod-hero-text reveal">
          <span className="prod-kicker">{t("kicker")}</span>
          <Heading as="h1" className="serif">
            {t("title1")}
            <br />
            <em>{t("title2")}</em>
          </Heading>
          <p className="prod-lead">{t("lead")}</p>
          <div className="prod-cta-row">
            <a href="#lineup" className="btn btn-navy">
              {t("explore")}
            </a>
            <Link href="/plans" className="prod-ghost-link">
              {t("compare")}
            </Link>
          </div>
        </div>
        <div
          className="prod-hero-media reveal d2"
          ref={heroMediaRef}
          onMouseMove={onHeroMove}
          onMouseLeave={onHeroLeave}
        >
          <Image
            src={cms.url("/assets/products/lumiq-ola-tablet-hero.webp")}
            alt={t("heroAlt")}
            width={1268}
            height={944}
            sizes="(max-width: 820px) 100vw, 50vw"
            priority
          />
        </div>
      </section>

      {/* Feature strip */}
      <section className="prod-feats reveal">
        <div className="container prod-feats-grid">
          {features.map(({ Icon, title, sub }) => (
            <div key={title} className="prod-feat">
              <span className="prod-feat-ico">
                <Icon size={20} strokeWidth={1.6} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{sub}</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive lineup */}
      <section id="lineup" className="container prod-lineup">
        <div className="prod-lineup-head reveal">
          <span className="prod-kicker">{t("lineup")}</span>
          <Heading as="h2" className="serif">{t("lineupTitle")}</Heading>
        </div>

        <div
          className="prod-tabs reveal"
          role="tablist"
          aria-label={t("productsAria")}
        >
          {products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`product-tab-${p.id}`}
              aria-controls="product-panel"
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className={`prod-tab${i === active ? " on" : ""}`}
              onClick={() => selectProduct(i)}
              onKeyDown={(event) => {
                const next = event.key === "ArrowRight" ? (i + 1) % products.length
                  : event.key === "ArrowLeft" ? (i + products.length - 1) % products.length
                  : event.key === "Home" ? 0 : event.key === "End" ? products.length - 1 : null;
                if (next === null) return;
                event.preventDefault();
                selectProduct(next);
                const target = document.getElementById(`product-tab-${products[next].id}`);
                target?.focus({ preventScroll: true });
                target?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
              }}
            >
              <span className="prod-tab-num serif">{p.tag}</span>
              <span className="prod-tab-name">{p.name}</span>
              <span className="prod-tab-sub">{p.sub}</span>
            </button>
          ))}
        </div>

        <div className="prod-carousel-shell">
        <nav className="prod-mobile-nav" aria-label={t('productsAria')}>
          <button type="button" onClick={() => stepProduct(-1)} aria-label={t('previous')}><ArrowLeft size={22} /></button>
          <span className="prod-counter" aria-live="polite" aria-atomic="true">{String(active + 1).padStart(2, '0')} {cms.text("field_48ba3248da14b636")}</span>
          <button type="button" onClick={() => stepProduct(1)} aria-label={t('next')}><ArrowRight size={22} /></button>
        </nav>
        <div ref={stageRef} className="prod-carousel" style={{touchAction: 'pan-y pinch-zoom'}} onDragStart={event => event.preventDefault()}>
          {products.map((p, i) => {
            const distance = (i - active + products.length) % products.length;
            const slot = ["center", "next", "far-next", "far-previous", "previous"][distance];
            const selected = slot === "center";
            const preview = slot === "previous" || slot === "next";
            return (
              <div
                key={p.id}
                className={`prod-slide${selected ? " prod-stage" : ""}${preview ? ` prod-peek prod-peek--${slot}` : ""}`}
                data-slot={slot}
                data-product-id={p.id}
                id={selected ? "product-panel" : undefined}
                role={selected ? "tabpanel" : preview ? "button" : undefined}
                aria-labelledby={selected ? `product-tab-${p.id}` : undefined}
                aria-label={preview ? `${t(slot === "previous" ? "previous" : "next")}: ${p.name}` : undefined}
                aria-hidden={!selected && !preview ? true : undefined}
                data-carousel-ready={selected ? (stageFullyVisible ? "true" : "false") : undefined}
                tabIndex={selected || preview ? 0 : -1}
                onClick={preview ? () => selectProduct(i) : undefined}
                onKeyDown={preview ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    selectProduct(i);
                  }
                } : undefined}
              >
                {!isPhone && (selected || preview) && <GlassCardMaterial animated={selected} />}
                <div className="prod-stage-media">
                  <Image
                    src={p.img}
                    alt={selected ? p.name : ""}
                    width={1000}
                    height={1000}
                    unoptimized={isPhone}
                    sizes="(max-width: 960px) 100vw, (max-width: 1500px) 45vw, 520px"
                    className={p.id === "nest" ? "nest" : ""}
                    loading={i === 0 || i === 1 || i === products.length - 1 ? "eager" : "lazy"}
                  />
                </div>
                <span className="prod-peek-caption" aria-hidden={selected}>
                  <small>{p.tag}</small>{p.name}
                </span>
                <div className="prod-stage-panel" aria-hidden={!selected}>
                  <div className="prod-panel-body">
                    <span className="prod-index serif" aria-hidden>{p.tag}</span>
                    <span className="prod-pill">{p.pill}</span>
                    <Heading as="h3" className="serif">{p.name}</Heading>
                    <div className="prod-sub">{p.sub}</div>
                    <p>{p.desc}</p>
                    <ul className="prod-specs">
                      {p.specs.map((spec) => (
                        <li key={spec}><span className="prod-tick" aria-hidden />{spec}</li>
                      ))}
                    </ul>
                    <Link href={p.href} className="prod-product-link" tabIndex={selected ? 0 : -1}>
                      {t("discover", { name: p.name })}
                    </Link>
                  </div>
                  <div className="prod-stage-nav">
                    <button type="button" aria-label={t("previous")} tabIndex={selected ? 0 : -1} onClick={(event) => { event.stopPropagation(); stepProduct(-1); }}>
                      <ArrowLeft size={18} strokeWidth={1.8} />
                    </button>
                    <span className="prod-counter">{p.tag} {cms.text("field_4e137c8eab6ae1ed")}</span>
                    <button type="button" aria-label={t("next")} tabIndex={selected ? 0 : -1} onClick={(event) => { event.stopPropagation(); stepProduct(1); }}>
                      <ArrowRight size={18} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </section>

      <section id="all-products" className="container prod-catalog" aria-labelledby="catalog-heading">
        <div className="prod-comparison-heading">
          <Heading as="h2" id="catalog-heading">{brand('comparison')}</Heading>
          <Image src={cms.url("/assets/brand/lumiq-logo-transparent-dark.png")} alt={cms.value("media.asset_e036cbcfe52d5970.alt")} width={180} height={70} />
          <p>{cms.text("field_49f53ec0cc8f512b")}</p>
        </div>
        <div className="prod-comparison-list">
          {products.map(product=><article className="prod-comparison-row" key={product.id}>
            <Image src={product.img} alt="" width={160} height={160} sizes="(max-width:600px) 64px, 80px" />
            <div><Heading as="h3">{product.name}</Heading><p>{brand(`audiences.${product.id==='pal'?'ola':product.id==='book'?'print':product.id}`)}</p></div>
            <div className="prod-comparison-purpose"><span>{brand('purpose')}</span><p>{product.desc}</p></div>
            <div><span className="prod-comparison-status">{brand('upcoming')}</span><Link href={product.href} prefetch={false}>{brand('explore')} <ArrowRight size={16} aria-hidden /></Link></div>
          </article>)}
        </div>
      </section>

      {/* Brand story invitation */}
      <section className="prod-story-invite reveal">
        <div className="container prod-story-invite-inner">
          <div className="prod-story-invite-heading">
            <span className="prod-kicker">{t("why")}</span>
            <Heading as="h2" className="serif">{t("whyTitle")}</Heading>
          </div>
          <div className="prod-story-invite-copy">
            <p>{t("whyBody")}</p>
            <Link href="/story" className="prod-story-link">
              <span>{t("story")}</span>
              <ArrowRight size={16} strokeWidth={1.7} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="prod-promise reveal">
        <div className="container prod-promise-grid">
          {promises.map(({ Icon, title, sub }) => (
            <div key={title} className="prod-promise-item">
              <span className="prod-promise-ico">
                <Icon size={22} strokeWidth={1.6} />
              </span>
              <strong>{title}</strong>
              <small>{sub}</small>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .prod-page { --prod-flow-bg: var(--cms-asset_e952cecf44ce1cc1, url('/assets/subpage-backgrounds-20260915/generated-set-02/flow-02-diagonal-convergence.webp')); background-color: #fbfbfe; background-image: var(--prod-flow-bg); background-position: center; background-repeat: no-repeat; background-size: cover; background-attachment: fixed; color: var(--ink); padding-top: 6.5rem; line-height: 1.6; }
        .prod-page .container { max-width: 1200px; }

        .prod-page > .prod-catalog { padding-top: 2rem; padding-bottom: clamp(5rem, 8vw, 8rem); scroll-margin-top: 7rem; }
        .prod-catalog h2 { font-size: clamp(2rem, 4vw, 3rem); letter-spacing: -.04em; margin: 0 0 2.5rem; }
        .prod-catalog-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .prod-catalog-card { display: flex; flex-direction: column; width: 100%; min-width: 0; min-height: 490px; aspect-ratio: 1; border: 0; border-radius: 0; background: transparent; box-shadow: none; color: var(--ink); text-decoration: none; padding: clamp(2rem, 4vw, 3rem); }
        .prod-catalog-card:nth-child(odd) { border-right: 1px solid rgba(56,76,103,.2); }
        .prod-catalog-card:nth-child(n+3) { border-top: 1px solid rgba(56,76,103,.2); }
        .prod-catalog-card:focus-visible { outline: 2px solid var(--ink); outline-offset: 6px; }
        .prod-catalog-image { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; padding: 0 1rem 1.8rem; }
        .prod-catalog-image img { width: 100%; max-width: 330px; height: 100%; object-fit: contain; filter: drop-shadow(0 10px 10px rgba(35,40,51,.12)); }
        .prod-catalog-caption { position: relative; z-index: 1; text-align: center; flex-shrink: 0; padding-bottom: .3rem; }
        .prod-catalog-caption h3 { margin: 0 0 .3rem; font-size: clamp(1.15rem, 1.7vw, 1.45rem); font-weight: 600; letter-spacing: -.025em; }
        .prod-catalog-description { max-width: 26rem; min-height: 4.95em; margin: .8rem auto 1rem; color: var(--ink-2); font-size: .9375rem; line-height: 1.65; }
        .prod-catalog-explore { font-size: .9rem; color: var(--ink-2); text-underline-offset: 4px; }
        .prod-catalog-card:hover .prod-catalog-explore { text-decoration: underline; }
        .prod-catalog-more .prod-catalog-image { padding: 2rem; }
        .prod-catalog-more .prod-catalog-image img { filter: none; max-width: 260px; }
        .prod-catalog-more .prod-catalog-caption { padding-bottom: 7.8rem; }
        @media(max-width: 600px) {
          .prod-catalog-grid { grid-template-columns: minmax(0, 1fr); }
          .prod-catalog-card { aspect-ratio: auto; min-height: 0; padding: 2.5rem 1rem; }
          .prod-catalog-card:nth-child(odd) { border-right: 0; }
          .prod-catalog-card:nth-child(n+2) { border-top: 1px solid rgba(56,76,103,.2); }
          .prod-catalog-image { flex: none; height: 260px; }
          .prod-catalog-description { min-height: 0; }
          .prod-catalog-more .prod-catalog-caption { padding-bottom: 1rem; }
        }

        .prod-kicker { display: block; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 1rem; }
        .prod-ghost-link { color: var(--ink-2); border-bottom: 1px solid var(--ink-4); padding-bottom: 2px; font-size: 0.95rem; transition: color .25s, border-color .25s; }
        .prod-ghost-link:hover { color: var(--ink); border-color: var(--ink); }

        .prod-topbar { border-bottom: 1px solid var(--border); }
        .prod-topbar-inner { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.9rem 1.75rem; padding: 0.7rem 1.5rem; font-size: 0.6875rem; font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-3); }
        .prod-topbar-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--ink-4); }

        .prod-page > .prod-hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 4rem; align-items: center; padding-top: clamp(3.5rem, 5vw, 4.5rem); padding-bottom: clamp(3.5rem, 5vw, 4.5rem); }
        .prod-page > section::before { display: none; }
        .prod-hero-text h1 { font-size: clamp(2.75rem, 6vw, 4.75rem); line-height: 1.03; letter-spacing: -0.02em; margin: 0 0 1.5rem; }
        .prod-hero-text h1 em { font-style: italic; color: var(--gold); }
        .prod-lead { color: var(--ink-2); font-size: 1.125rem; line-height: 1.7; max-width: 30rem; }
        .prod-cta-row { display: flex; align-items: center; gap: 1.75rem; margin-top: 2.25rem; flex-wrap: wrap; }
        .prod-hero-media { display: flex; align-items: center; justify-content: center; aspect-ratio: 4 / 3; overflow: visible; }
        .prod-hero-media img { width: 112%; height: 112%; max-width: none; object-fit: contain; display: block; filter: drop-shadow(0 24px 28px rgba(31,23,14,.12)) drop-shadow(0 7px 10px rgba(31,23,14,.08)); transform: translate(var(--px, 0px), var(--py, 0px)) scale(.98); transition: transform 0.5s ease-out; will-change: transform; }

        .prod-page > .prod-feats { position: relative; isolation: isolate; padding: clamp(1.5rem, 2.8vw, 2.5rem) 0; background: transparent !important; border: 0; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
        .prod-page > .prod-feats::before, .prod-page > .prod-feats::after { display: none; }
        .prod-feats-grid { position: relative; z-index: 1; display: flex; flex-wrap: wrap; justify-content: center; width: calc(100vw - 5rem); max-width: none !important; margin-left: calc((100vw - 100%) / -2 + 2.5rem); gap: clamp(1rem, 2.1vw, 2.5rem); }
        .prod-feat { display: flex; flex: 1 1 12rem; align-items: center; gap: .9rem; min-width: 0; max-width: none; padding: .85rem 1.15rem .85rem .85rem; border: 1px solid rgba(255,255,255,.78); border-radius: 999px; background: linear-gradient(135deg, rgba(255,255,255,.32), rgba(232,240,255,.13)); box-shadow: inset 0 1px 0 rgba(255,255,255,.9), inset 0 -1px 0 rgba(255,255,255,.22), 0 14px 30px rgba(43,54,86,.11); -webkit-backdrop-filter: blur(26px) saturate(150%); backdrop-filter: blur(26px) saturate(150%); transition: transform .25s ease, background .25s ease, box-shadow .25s ease; }
        .prod-feat:hover { transform: translateY(-2px); background: linear-gradient(135deg, rgba(255,255,255,.47), rgba(226,237,255,.21)); box-shadow: inset 0 1px 0 rgba(255,255,255,.96), inset 0 -1px 0 rgba(255,255,255,.3), 0 18px 34px rgba(43,54,86,.15); }
        .prod-feat-ico { width: 38px; height: 38px; border: 1px solid rgba(255,255,255,.82); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: var(--ink); background: linear-gradient(135deg, rgba(255,255,255,.5), rgba(218,230,255,.18)); box-shadow: inset 0 1px 0 rgba(255,255,255,.92), 0 5px 12px rgba(43,54,86,.08); -webkit-backdrop-filter: blur(16px) saturate(150%); backdrop-filter: blur(16px) saturate(150%); flex-shrink: 0; transition: background .25s ease, transform .25s ease; }
        .prod-feat:hover .prod-feat-ico { background: linear-gradient(135deg, rgba(255,255,255,.7), rgba(213,226,255,.3)); color: var(--ink); transform: scale(1.05); }
        .prod-feat strong { display: block; font-size: .875rem; line-height: 1.2; color: var(--ink); }
        .prod-feat small { display: block; font-size: .75rem; line-height: 1.25; color: var(--ink-3); margin-top: .18rem; }

        .prod-page > .prod-lineup { padding-top: clamp(4rem, 6vw, 5rem); padding-bottom: clamp(4rem, 6vw, 5rem); scroll-margin-top: 5rem; }
        .prod-lineup-head h2 { font-size: clamp(2rem, 4vw, 3rem); line-height: 1.12; margin: 0; max-width: 680px; }

        .prod-tabs { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.25rem; margin: 3rem 0 3.5rem; }
        .prod-tab { text-align: left; background: none; border: 0; border-top: 1px solid var(--border); padding: 1.25rem 0 0; cursor: pointer; position: relative; color: var(--ink-4); font-family: inherit; transition: color .3s; }
        .prod-tab::before { content: ""; position: absolute; top: -1px; left: 0; width: 0; height: 2px; background: var(--gold); transition: width .5s cubic-bezier(0.22, 1, 0.36, 1); }
        .prod-tab:hover { color: var(--ink-2); }
        .prod-tab.on { color: var(--ink); }
        .prod-tab.on::before { width: 100%; }
        .prod-tab-num { display: block; font-size: 0.9375rem; font-style: italic; }
        .prod-tab-name { display: block; font-family: var(--font-serif); font-size: 1.375rem; margin-top: 0.35rem; }
        .prod-tab-sub { display: block; font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.35rem; }

        .prod-carousel { --center-width: min(70%, 1125px); --side-width: calc((100% - var(--center-width)) / 2 - .75rem); position: relative; width: calc(100vw - 3rem); height: clamp(560px, calc(100vh - 7.25rem), 700px); margin-left: 50%; transform: translateX(-50%); perspective: 1800px; }
        .prod-slide { position: absolute; top: 50%; left: 50%; z-index: 0; isolation: isolate; width: var(--center-width); height: 100%; overflow: visible; border: 0; border-radius: 38px; background: transparent; color: var(--ink); box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; transform: translate(-50%,-50%) rotateY(0deg); transition: left .68s cubic-bezier(.22,1,.36,1), width .68s cubic-bezier(.22,1,.36,1), height .68s cubic-bezier(.22,1,.36,1), opacity .4s ease; }
        .prod-slide[data-slot="center"] { left: 50%; z-index: 2; width: var(--center-width); height: 100%; opacity: 1; }
        .prod-slide[data-slot="previous"], .prod-slide[data-slot="far-previous"] { left: calc(var(--side-width) / 2); width: var(--side-width); height: 76%; transform: translate(-50%,-50%) rotateY(5deg); }
        .prod-slide[data-slot="next"], .prod-slide[data-slot="far-next"] { left: calc(100% - var(--side-width) / 2); width: var(--side-width); height: 76%; transform: translate(-50%,-50%) rotateY(-5deg); }
        .prod-slide[data-slot="previous"], .prod-slide[data-slot="next"] { z-index: 1; opacity: .68; cursor: pointer; }
        .prod-slide[data-slot^="far-"] { opacity: 0; pointer-events: none; }
        .prod-stage:focus-visible, .prod-peek:focus-visible { outline: 2px solid var(--ink); outline-offset: 3px; }
        .prod-peek:hover, .prod-peek:focus-visible { opacity: .9; }
        .prod-stage-media { position: absolute; z-index: 1; left: .5rem; top: .75rem; width: calc(100% - 1rem); height: 75%; overflow: hidden; transition: left .68s cubic-bezier(.22,1,.36,1), top .68s cubic-bezier(.22,1,.36,1), width .68s cubic-bezier(.22,1,.36,1), height .68s cubic-bezier(.22,1,.36,1); }
        .prod-stage .prod-stage-media { left: clamp(1rem, 1.8vw, 1.65rem); top: clamp(1rem, 1.8vw, 1.65rem); width: calc(44% - 1rem); height: calc(100% - clamp(2rem, 3.6vw, 3.3rem)); }
        .prod-stage-media img { display: block; width: 100%; height: 100%; object-fit: contain; padding: clamp(.5rem, 1.2vw, 1rem); filter: drop-shadow(0 14px 18px rgba(35,42,64,.12)); transition: transform .68s cubic-bezier(.22,1,.36,1); }
        .prod-stage .prod-stage-media img { padding: clamp(1rem, 3vw, 2.25rem); }
        .prod-stage .prod-stage-media img.nest { padding: clamp(1.25rem, 3vw, 2.5rem); }
        .prod-stage .prod-stage-media:hover img { transform: scale(1.025); }
        .prod-peek-caption { position: absolute; z-index: 2; left: 1rem; right: 1rem; bottom: 1.25rem; display: flex; flex-direction: column; font-size: clamp(.8rem, 1.3vw, 1.1rem); font-weight: 600; line-height: 1.3; white-space: nowrap; opacity: 1; transition: opacity .2s ease; }
        .prod-peek-caption small { margin-bottom: .25rem; color: var(--ink-3); font-size: .75rem; font-weight: 500; }
        .prod-peek--next .prod-peek-caption { align-items: flex-end; }
        .prod-stage .prod-peek-caption, .prod-slide[data-slot^="far-"] .prod-peek-caption { opacity: 0; }

        .prod-stage-panel { position: absolute; z-index: 3; top: 0; left: 49%; width: 50%; height: 100%; min-width: 0; display: flex; flex-direction: column; justify-content: center; padding: clamp(.25rem, .7vw, .75rem) clamp(.25rem, 1.5vw, 1.5rem) clamp(.25rem, .7vw, .75rem) 0; opacity: 0; pointer-events: none; transition: opacity .3s ease; }
        .prod-stage .prod-stage-panel { opacity: 1; pointer-events: auto; transition-delay: .18s; }
        .prod-index { display: block; font-size: clamp(2.75rem, 4vw, 4rem); line-height: .9; color: var(--lilac-2); }
        .prod-pill { display: inline-block; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--gold); margin: 0.55rem 0 0.65rem; }
        .prod-panel-body h3 { font-size: clamp(1.9rem, 3vw, 2.6rem); line-height: 1.1; margin: 0; }
        .prod-sub { font-size: 0.8125rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); margin: 0.45rem 0 0.7rem; }
        .prod-panel-body p { color: var(--ink-2); line-height: 1.55; margin-bottom: 1rem; }
        .prod-page .prod-specs { width: 100%; list-style: none; margin: 0; padding: 0 0 1.15rem; }
        .prod-page .prod-specs li { display: flex; align-items: center; gap: 0.7rem; padding: 0.38rem 0; border-bottom: 1px dashed var(--border); font-size: 0.9375rem; color: var(--ink-2); }
        .prod-tick { width: 5px; height: 5px; background: var(--gold); flex-shrink: 0; }
        .prod-page .prod-product-link { position: relative; display: inline-flex; align-items: center; justify-content: center; width: fit-content; min-height: 44px; margin-top: .15rem; padding: .68rem 1.5rem; border-radius: 999px; background: var(--ink); color: #fff; font-size: .9375rem; font-weight: 600; line-height: 1.2; transition: color .25s ease, background .25s ease, box-shadow .25s ease, transform .25s ease; }
        .prod-page .prod-product-link:hover { background: var(--gold); color: #fff; transform: translateY(-2px); box-shadow: 0 12px 26px rgba(24,18,10,.14); }
        .prod-page .prod-product-link:focus-visible { outline: 2px solid var(--ink); outline-offset: 4px; }

        .prod-stage-nav { display: flex; align-items: center; gap: 1.25rem; margin-top: 1rem; }
        .prod-stage-nav button { width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,.76); background: rgba(255,255,255,.48); color: var(--ink); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: inset 0 1px 0 rgba(255,255,255,.75); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); transition: background .25s, color .25s, border-color .25s; }
        .prod-stage-nav button:hover { background: var(--ink); color: #fff; border-color: var(--ink); }
        .prod-counter { font-size: 0.8125rem; letter-spacing: 0.14em; color: var(--ink-3); }

        .prod-page > .prod-story-invite { padding-top: 0; padding-bottom: 0; border: 0; background: transparent; }
        .prod-page > .prod-story-invite .prod-story-invite-inner { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(18rem, .85fr); gap: clamp(3rem, 8vw, 7rem); align-items: center; min-height: clamp(22rem, 28vw, 27rem); padding-top: clamp(5rem, 7vw, 7rem); padding-bottom: clamp(5rem, 7vw, 7rem); }
        .prod-story-invite .prod-kicker { margin-bottom: .8rem; }
        .prod-story-invite-heading h2 { max-width: 36rem; font-size: clamp(1.85rem, 3.2vw, 2.5rem); line-height: 1.16; }
        .prod-story-invite-copy p { color: var(--ink-2); font-size: .975rem; line-height: 1.75; margin: .15rem 0 1.5rem; }
        .prod-story-link { display: inline-flex; align-items: center; gap: .55rem; color: var(--ink-2); font-size: .875rem; font-weight: 600; }
        .prod-story-link svg { transition: transform .25s ease; }
        .prod-story-link:hover { color: var(--gold); }
        .prod-story-link:hover svg { transform: translateX(3px); }
        .prod-story-link:focus-visible { outline: 2px solid var(--ink); outline-offset: 5px; }

        .prod-page > .prod-promise { padding-top: 0; padding-bottom: 0; }
        .prod-promise-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
        .prod-promise-item { display: flex; flex-direction: column; gap: 0.35rem; padding: 2.75rem 1.75rem; border-left: 1px solid var(--border); }
        .prod-promise-item:first-child { border-left: none; }
        .prod-promise-ico { color: var(--gold); margin-bottom: 0.5rem; }
        .prod-promise-item strong { font-size: 0.9375rem; color: var(--ink); }
        .prod-promise-item small { font-size: 0.8125rem; color: var(--ink-3); line-height: 1.5; }

        @media (max-width: 960px) {
          .prod-page > .prod-hero { grid-template-columns: 1fr; gap: 2.5rem; padding-top: 3.5rem; padding-bottom: 3.5rem; }
          .prod-feats-grid { display: flex; justify-content: center; gap: .65rem; }
          .prod-feat { flex-basis: 14rem; max-width: none; border: 1px solid rgba(255,255,255,.58); }
          .prod-page > .prod-lineup { padding-top: 4rem; padding-bottom: 3.5rem; }
          .prod-tabs { display: flex; overflow-x: auto; gap: .6rem; margin: 1.5rem 0; padding: 5px 4px 12px; scrollbar-width: thin; }
          .prod-tab { flex: 0 0 auto; min-height: 48px; padding: .75rem 1rem; border: 1px solid var(--border-h); border-radius: 999px; }
          .prod-tab.on { background: var(--navy); color: #fff; border-color: var(--navy); }
          .prod-tab::before, .prod-tab-num, .prod-tab-sub { display: none; }
          .prod-tab-name { margin: 0; font-family: var(--font-sans); font-size: 14px; font-weight: 600; white-space: nowrap; }
          .prod-carousel { width: 100%; height: auto; margin-left: 0; transform: none; }
          .prod-slide:not(.prod-stage) { display: none; }
          .prod-slide[data-slot="center"] { position: relative; top: auto; left: auto; width: 100%; height: auto; min-height: 0; padding: 1.25rem; border-radius: 30px; transform: none; }
          .prod-stage .prod-stage-media { position: relative; top: auto; left: auto; width: 100%; height: auto; aspect-ratio: 1 / 1; }
          .prod-stage-panel, .prod-stage .prod-stage-panel { position: relative; top: auto; left: auto; width: 100%; height: auto; padding: 1.5rem .5rem .75rem; }
          .prod-page > .prod-story-invite .prod-story-invite-inner { grid-template-columns: 1fr; gap: 2rem; min-height: 0; padding-top: 5rem; padding-bottom: 5rem; }
          .prod-promise-grid { grid-template-columns: repeat(2, 1fr); }
          .prod-promise-item:nth-child(odd) { border-left: none; }
          .prod-promise-item:nth-child(n+3) { border-top: 1px solid var(--border); }
        }
        @media (max-width: 640px) {
          .prod-page > .prod-hero { padding-top: 3rem; padding-bottom: 3rem; }
          .prod-page > .prod-lineup { padding-top: 3.5rem; padding-bottom: 3rem; }
          .prod-feats-grid, .prod-promise-grid { grid-template-columns: 1fr; }
          .prod-feat { flex-basis: 100%; padding: .72rem .9rem; border: 1px solid rgba(255,255,255,.58) !important; }
          .prod-promise-item { border-left: none !important; border-top: 1px solid var(--border); padding: 1.4rem .5rem; }
          .prod-promise-item:first-child { border-top: none; }
          .prod-topbar-inner { gap: 0.5rem 1rem; letter-spacing: 0.12em; }
          .prod-hero-media img { width: 108%; height: 108%; transform: scale(.98); }
          .prod-page .prod-product-link { width: 100%; min-height: 48px; }
          .prod-page > .prod-story-invite .prod-story-invite-inner { padding-top: 4.5rem; padding-bottom: 4.5rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .prod-hero-media img, .prod-stage-media img, .prod-story-link svg, .prod-slide { transition: none; animation: none; }
        }
      `}</style>
    </main>
  );
}
