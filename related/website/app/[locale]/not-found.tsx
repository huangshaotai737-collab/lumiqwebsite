import Heading from "@/components/Heading";
import Link from "next/link";
import {hasLocale} from "next-intl";
import {getLocale, getTranslations} from "next-intl/server";
import {routing} from "@/i18n/routing";

export default async function LocaleNotFound() {
  const requestedLocale = await getLocale();
  const locale = hasLocale(routing.locales, requestedLocale) ? requestedLocale : routing.defaultLocale;
  const t = await getTranslations({locale, namespace: "NotFound"});

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{background: "#fff"}}>
      <div style={{maxWidth: 460, textAlign: "center"}}>
        <span style={{fontSize: ".75rem", fontWeight: 600, letterSpacing: ".12em", color: "var(--gold)"}}>{t("eyebrow")}</span>
        <Heading as="h1" className="serif" style={{fontSize: "clamp(5rem, 15vw, 8rem)", fontWeight: 600, color: "var(--ink)", lineHeight: 1, margin: ".75rem 0 0"}}>404<span style={{color: "var(--gold)"}}>.</span></Heading>
        <Heading as="h2" className="serif" style={{marginTop: "1rem", fontSize: "1.35rem", color: "var(--ink)"}}>{t("title")}</Heading>
        <p style={{marginTop: ".6rem", fontSize: ".95rem", color: "var(--ink-3)", lineHeight: 1.7}}>{t("body")}</p>
        <div style={{marginTop: "2rem", display: "flex", gap: "1.5rem", justifyContent: "center", alignItems: "center", flexWrap: "wrap"}}>
          <Link href={`/${locale}`} className="btn btn-navy">{t("home")}</Link>
          <Link href={`/${locale}/products`} style={{color: "var(--ink-2)", fontSize: ".95rem", borderBottom: "1px solid var(--ink-4)", paddingBottom: 2}}>{t("products")}</Link>
        </div>
      </div>
    </div>
  );
}
