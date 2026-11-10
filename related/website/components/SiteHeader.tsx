"use client";
import {useSitePathname} from "@/components/content/useSitePathname";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {useVisualPreview} from '@/components/content/SiteContentProvider';
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams, useRouter as useNextRouter } from "next/navigation";
import {useLinkStatus} from "next/link";
import {PrefetchKind} from "next/dist/client/components/router-reducer/router-reducer-types";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Globe2, Menu, X } from "lucide-react";
import type { Locale } from "@/i18n/routing";
import Image from "@/components/content/ContentImage";
import CartTrigger from "@/components/cart/CartTrigger";

function NavigationPending() {
  const {pending} = useLinkStatus();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!pending) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), 1000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  return pending && visible ? <span className="site-navigation-pending" aria-hidden="true" /> : null;
}

export default function SiteHeader() {
  const cms = useContentAdapter();
  const visual = useVisualPreview();
  const t = useTranslations("Common");
  const home = useTranslations("HomeRefresh");
  const members = useTranslations("Members");
  const locale = useLocale() as Locale;
  const pathname = useSitePathname();
  const router = useRouter();
  const nextRouter = useNextRouter();
  const warmed = useRef(new Map<string, number>());
  const searchParams = useSearchParams();
  const isHomepage = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const languageRef = useRef<HTMLButtonElement>(null);

  const nav = [
    { href: "/", label: t("home") },
    { href: "/products", label: t("products") },
    { href: "/story", label: t("brandStory") },
    { href: "/plans", label: t("plans") },
    { href: "/members", label: members("nav") },
    { href: "/faq", label: t("faq") },
  ] as const;

  const languages: { locale: Locale; code: string; label: string }[] = [
    { locale: "en", code: cms.text("field_dbf7fc4623365aca"), label: t("english") },
    { locale: "zh-hant", code: cms.text("field_88d310bbf9c719ef"), label: t("traditionalChinese") },
    { locale: "ja", code: cms.text("field_4f1ba9da652781b3"), label: t("japanese") },
  ];
  const activeLanguage =
    languages.find((item) => item.locale === locale) ?? languages[0];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > (isHomepage ? 64 : 8));
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHomepage]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 1200px)");
    const closeOnWide = () => {
      if (wide.matches) setMenuOpen(false);
    };
    wide.addEventListener("change", closeOnWide);
    return () => wide.removeEventListener("change", closeOnWide);
  }, []);

  useEffect(() => {
    if (!langOpen && !menuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Element &&
        !event.target.closest(".lang-switch")
      )
        setLangOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setLangOpen(false);
        setMenuOpen(false);
        (menuOpen ? triggerRef : languageRef).current?.focus();
      }
      if (event.key === "Tab" && menuOpen) {
        const items = Array.from(
          navRef.current?.querySelectorAll<HTMLElement>(
            "a[href], button:not([disabled])",
          ) ?? [],
        ).filter((item) => item.getClientRects().length > 0);
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [langOpen, menuOpen]);

  const closeMenu = () => {
    setMenuOpen(false);
    setLangOpen(false);
  };

  // Intent takes priority over speculative homepage warmup, even if an image is
  // slow. Keep private/account routes and CMS previews out of the public cache.
  const warmDestination = (href: string) => {
    if (visual || cms.preview || href === "/members" || href === pathname) return;
    const target = `/${locale}${href === "/" ? "" : href}`;
    const now = Date.now();
    if (now - (warmed.current.get(target) ?? 0) < 30_000) return;
    warmed.current.set(target, now);
    nextRouter.prefetch(target, {kind: PrefetchKind.FULL});
  };
  const navigateHome = (event: {preventDefault(): void}) => {
    closeMenu();
    if (!isHomepage || visual || cms.preview) return;
    event.preventDefault();
    // A Link to the current route is a router no-op. Explicitly release reading
    // anchors and return to the opening, including keyboard and mobile clicks.
    window.dispatchEvent(new Event("lumiq:home-top"));
    if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
    window.scrollTo({top: 0, behavior: "instant"});
    document.querySelector<HTMLElement>("#main-content")?.focus({preventScroll: true});
  };

  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const switchLanguage = (nextLocale: Locale) => {
    if(visual){window.dispatchEvent(new CustomEvent('lumiq:visual-language',{detail:nextLocale}));setLangOpen(false);setMenuOpen(false);return;}
    const query = searchParams.toString();
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    router.replace(`${pathname}${query ? `?${query}` : ""}${hash}`, {
      locale: nextLocale,
      scroll: false,
    });
    setLangOpen(false);
    setMenuOpen(false);
  };

  return (
    <nav
      ref={navRef}
      aria-label={t("primaryNavigation")}
      className={`navbar site-nav${isHomepage ? " home-nav" : ""}${scrolled || menuOpen ? " scrolled" : ""}${menuOpen ? " menu-open" : ""}`}
    >
      {isHomepage && (
        <a href="#main-content" className="lh-skip">
          {home("skip")}
        </a>
      )}
      <div className="container nav-inner">
        <Link prefetch={false} href="/" className="nav-logo" onClick={closeMenu} onNavigate={navigateHome}
          onMouseEnter={() => warmDestination("/")} onFocus={() => warmDestination("/")} onTouchStart={() => warmDestination("/")}>
          <Image
            src={cms.url("/assets/brand/lumiq-logo-transparent-dark.png")}
            alt={isHomepage ? cms.text("field_430041fc9b25a88e") : cms.text("field_b805d448f3a55978")}
            className="nav-logo-img"
            width={360}
            height={96}
            priority
          />
        </Link>

        <div
          className="site-desktop-nav hidden md:flex"
          aria-label={t("primaryNavigation")}
        >
          {nav.map((l) => (
            <Link
              prefetch={false}
              key={l.href}
              href={l.href}
              className={isActive(l.href) ? "active" : ""}
              aria-current={isActive(l.href) ? "page" : undefined}
              onMouseEnter={() => warmDestination(l.href)}
              onFocus={() => warmDestination(l.href)}
              onTouchStart={() => warmDestination(l.href)}
              onNavigate={l.href === "/" ? navigateHome : undefined}
            >
              {l.label}
              <NavigationPending />
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <CartTrigger onOpen={closeMenu} />
          <div className="lang-switch site-desktop-action hidden md:block">
            <button
              type="button"
              ref={languageRef}
              className="lang-btn"
              onClick={() => setLangOpen((v) => !v)}
              aria-label={`${t("language")}: ${activeLanguage.label}`}
              aria-controls={langOpen ? "site-language-options" : undefined}
              aria-expanded={langOpen}
            >
              <Globe2 size={16} aria-hidden="true" /> {activeLanguage.code}{" "}
              <span className="lang-caret">{cms.text("field_a11b193e1a6e95b8")}</span>
            </button>
            {langOpen && (
              <ul id="site-language-options" className="lang-menu" aria-label={t("language")}>
                {languages.map((o) => (
                  <li key={o.locale}>
                    <button
                      type="button"
                      aria-current={locale === o.locale ? "true" : undefined}
                      className={`lang-item${locale === o.locale ? " active" : ""}`}
                      onClick={() => switchLanguage(o.locale)}
                    >
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            prefetch={false}
            href="/prelaunch"
            onClick={closeMenu}
            onMouseEnter={() => warmDestination("/prelaunch")}
            onFocus={() => warmDestination("/prelaunch")}
            onTouchStart={() => warmDestination("/prelaunch")}
            className="btn btn-ghost-navy login-btn site-login-btn"
            aria-label={t("login")}
          >
            <span className="site-login-full">{t("login")}</span>
            <span className="site-login-short" aria-hidden="true">{t("loginShort")}</span>
          </Link>

          <button
            type="button"
            ref={triggerRef}
            className="site-mobile-trigger flex md:hidden"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? (
              <X size={22} strokeWidth={2.2} />
            ) : (
              <Menu size={22} strokeWidth={2.2} />
            )}
            <span className="site-mobile-trigger-label">{t("menu")}</span>
          </button>
        </div>
      </div>

      <div
        id="mobile-navigation"
        className={`site-mobile-menu md:hidden ${menuOpen ? "flex open" : "hidden"}`}
        aria-hidden={!menuOpen}
      >
        <div className="site-mobile-menu-head">
          <span>{t("menu")}</span>
          <button
            type="button"
            className="site-mobile-close"
            aria-label={t("closeMenu")}
            onClick={() => { closeMenu(); triggerRef.current?.focus(); }}
          >
            <X size={20} />
          </button>
        </div>
        {nav.map((l) => (
          <Link
            prefetch={false}
            key={l.href}
            href={l.href}
            aria-current={isActive(l.href) ? "page" : undefined}
            onClick={closeMenu}
            onMouseEnter={() => warmDestination(l.href)}
            onFocus={() => warmDestination(l.href)}
            onTouchStart={() => warmDestination(l.href)}
            onNavigate={l.href === "/" ? navigateHome : undefined}
            className={isActive(l.href) ? "active" : ""}
          >
            {l.label}
            <NavigationPending />
          </Link>
        ))}
        <div className="site-mobile-languages" aria-label={t("language")}>
          {languages.map((item) => (
            <button
              key={item.locale}
              type="button"
              className={locale === item.locale ? "active" : ""}
              onClick={() => switchLanguage(item.locale)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
