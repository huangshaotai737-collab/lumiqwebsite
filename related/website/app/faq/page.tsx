"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import Heading from "@/components/Heading";

import { useMemo, useRef, useState } from "react";
import Script from "next/script";
import { Search, X } from "lucide-react";
import {useTranslations} from "next-intl";

export default function FaqPage() {
  const cms = useContentAdapter();
  const t = useTranslations("Faq");
  const faq = useTranslations("BrandFaq");
  const storyFaq = useTranslations("BrandStoryFaq");
  const [open, setOpen] = useState<number | null>(0);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const faqs = useMemo(() => Array.from({length:17},(_,index)=>index+1).map((i) => ({
    q: faq(`q${i}`),
    a: faq(`a${i}`),
  })).concat({q: storyFaq("question"), a: storyFaq("answer")}), [faq, storyFaq]);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return faqs;
    return faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [faqs, query]);

  return (
    <main className="editorial-page faq-page" style={{ paddingTop: "6rem", color: "var(--ink)" }}>
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <section className="container" style={{ padding: "2rem 2rem 3rem" }}>
        <span className="kicker">{t("eyebrow")}</span>
        <Heading as="h1" className="serif" style={{ margin: "1rem 0 1.5rem", maxWidth: 700 }}>
          {t("title")}
        </Heading>
        <p style={{ fontSize: "1.15rem", color: "var(--ink-2)", lineHeight: 1.7, maxWidth: 640 }}>
          {t("introBefore")} <a href={"mailto:" + cms.value("messages.{locale}.CmsStatic.field_23cd241d015790f4")} className="faq-mail">{cms.value("messages.{locale}.CmsStatic.field_23cd241d015790f4")}</a> {t("introAfter")}
        </p>
      </section>

      <section className="container" style={{ maxWidth: 760, padding: "1rem 2rem 6rem" }}>
        <div className="faq-search">
          <Search size={16} strokeWidth={1.8} aria-hidden />
          <input
            ref={searchRef}
            type="search"
            placeholder={t("search")}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
            aria-label={t("searchLabel")}
          />
          {query && <button type="button" className="faq-clear" aria-label={t("clearSearch")} onClick={() => { setQuery(""); setOpen(0); searchRef.current?.focus(); }}><X size={16} aria-hidden /></button>}
          <span className="faq-count" role="status" aria-live="polite" aria-atomic="true">{t("results", { count: visible.length, total: faqs.length })}</span>
        </div>

        {visible.length === 0 && (
          <p style={{ padding: "2.5rem 0", color: "var(--ink-3)", textAlign: "center" }}>
            {t("empty")}
          </p>
        )}

        {visible.map((f) => {
          const idx = faqs.indexOf(f);
          const isOpen = open === idx;
          return (
            <div key={f.q} className="faq-row">
              <button className="faq-q" id={`faq-question-${idx}`} onClick={() => setOpen(isOpen ? null : idx)} aria-expanded={isOpen} aria-controls={`faq-answer-${idx}`}>
                <span>{f.q}</span>
                <span className={`faq-plus${isOpen ? " open" : ""}`} aria-hidden>{cms.text("field_746d580ff27ae9e6")}</span>
              </button>
              <div id={`faq-answer-${idx}`} role="region" aria-labelledby={`faq-question-${idx}`} aria-hidden={!isOpen} className={`faq-a${isOpen ? " open" : ""}`}>
                <p>{f.a}</p>
              </div>
            </div>
          );
        })}
      </section>

      <style>{`
        .faq-mail { color: var(--ink); border-bottom: 1px solid var(--ink-4); transition: color .2s, border-color .2s; }
        .faq-mail:hover { color: var(--gold); border-color: var(--gold); }

        .faq-search { display: flex; align-items: center; gap: .75rem; border: 1px solid var(--border-h); border-radius: 999px; padding: .7rem 1.25rem; margin-bottom: 2rem; color: var(--ink-3); transition: border-color .25s, box-shadow .25s; background: #fff; }
        .faq-search:focus-within { border-color: var(--ink); box-shadow: var(--shadow); }
        .faq-search input { flex: 1; border: 0; outline: none; background: transparent; font: inherit; font-size: .95rem; color: var(--ink); }
        .faq-search input::placeholder { color: var(--ink-4); }
        .faq-count { font-size: .75rem; letter-spacing: .1em; color: var(--ink-4); }
        .faq-search input { min-width: 0; width: 100%; }
        .faq-count { flex-shrink: 0; letter-spacing: 0; }
        .faq-clear { flex: 0 0 44px; height: 44px; display: grid; place-items: center; border-radius: 50%; background: transparent; color: var(--ink-3); cursor: pointer; }
        .faq-clear:hover { background: var(--cream-3); }
        .faq-search input::-webkit-search-cancel-button { display: none; }

        .faq-row { border-bottom: 1px solid var(--border); }
        .faq-q { width: 100%; text-align: left; background: transparent; cursor: pointer; padding: 1.5rem 0; display: flex; justify-content: space-between; align-items: center; gap: 1rem; font-family: var(--font-serif); font-size: 1.2rem; color: var(--ink); transition: color .25s; }
        .faq-q:hover { color: var(--gold); }
        .faq-plus { color: var(--gold); font-size: 1.5rem; line-height: 1; transition: transform .35s cubic-bezier(.22,1,.36,1); }
        .faq-plus.open { transform: rotate(45deg); }
        .faq-a { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .45s cubic-bezier(.22,1,.36,1); }
        .faq-a.open { grid-template-rows: 1fr; }
        .faq-a > p { overflow: hidden; margin: 0; color: var(--ink-2); line-height: 1.7; }
        .faq-a.open > p { padding-bottom: 1.5rem; }
      `}</style>
    </main>
  );
}
