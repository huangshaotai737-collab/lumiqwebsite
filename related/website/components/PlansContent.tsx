"use client";
import Heading from "@/components/Heading";


import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import Image from "next/image";
import RevealObserver from "@/components/RevealObserver";
import { PRODUCT_BY_ID } from "@/lib/products";

type Billing = "yearly" | "monthly";
type Row = { label: string; values: (string | boolean)[] };

const hardware = [
  {
    name: PRODUCT_BY_ID.tablet.name,
    price: "399",
    img: PRODUCT_BY_ID.tablet.image,
    imageFit: "cover",
    blurbKey: "tabletBlurb",
    href: PRODUCT_BY_ID.tablet.href,
  },
  {
    name: PRODUCT_BY_ID.ola.name,
    price: "599",
    img: PRODUCT_BY_ID.ola.image,
    imageFit: "contain-ola",
    blurbKey: "palBlurb",
    href: PRODUCT_BY_ID.ola.href,
  },
  {
    name: PRODUCT_BY_ID.print.name,
    price: "69",
    img: PRODUCT_BY_ID.print.image,
    imageFit: "contain-print",
    blurbKey: "printBlurb",
    href: PRODUCT_BY_ID.print.href,
  },
  {
    name: PRODUCT_BY_ID.nest.name,
    price: null,
    img: PRODUCT_BY_ID.nest.image,
    imageFit: "cover",
    blurbKey: "nestBlurb",
    href: PRODUCT_BY_ID.nest.href,
  },
];

const tabletCols = ["Free", "Lite", "Pro"];
const tabletRows: Row[] = [
  {
    label: "monthlyFee",
    values: ["—", "$6.99 yr / $7.99 mo", "$12.99 yr / $14.99 mo"],
  },
  { label: "freeTrial", values: ["—", "7 days", "7 days"] },
  { label: "kidProfile", values: ["1", "1", "3"] },
  { label: "classicalStory", values: ["50", "Unlimited", "Unlimited"] },
  { label: "characters", values: ["—", "1", "3"] },
  { label: "generation", values: ["—", "2", "5"] },
  { label: "reimagined", values: ["—", "—", "5"] },
  { label: "storyQuest", values: ["—", "3", "10"] },
  { label: "original", values: ["—", "3", "10"] },
  { label: "printAddon", values: ["$69", "$59", "$49"] },
];

const palCols = ["Free", "Lite", "Pro", "Ultra"];
const palRows: Row[] = [
  {
    label: "monthlyFee",
    values: [
      "—",
      "$16.99 yr / $19.99 mo",
      "$26.99 yr / $29.99 mo",
      "$35.99 yr / $39.99 mo",
    ],
  },
  { label: "freeTrial", values: ["—", "7 days", "7 days", "7 days"] },
  { label: "character", values: ["1", "2", "3", "4"] },
  { label: "voice", values: [false, true, true, true] },
  { label: "personality", values: [false, true, true, true] },
  { label: "reminder", values: [false, true, true, true] },
  { label: "connect", values: [true, true, true, true] },
  { label: "dayLimit", values: ["2", "8", "12", "24"] },
];

const FEE_RE = /^\$([\d.]+) yr \/ \$([\d.]+) mo$/;

type Labels = Record<string, string>;

function cell(v: string | boolean, billing: Billing, labels: Labels) {
  if (v === true)
    return <span style={{ color: "var(--gold)", fontWeight: 600 }}>✓</span>;
  if (v === false) return <span style={{ color: "var(--ink-4)" }}>—</span>;
  const m = typeof v === "string" ? v.match(FEE_RE) : null;
  if (m) {
    const price = billing === "yearly" ? m[1] : m[2];
    return (
      <span className="fee-cell">
        <strong className="serif">${price}</strong> {labels.perMonth}
        <em>
          {billing === "yearly" ? labels.billedYearly : labels.billedMonthly}
        </em>
      </span>
    );
  }
  if (v === "Unlimited") return <span>{labels.unlimited}</span>;
  const days = typeof v === "string" ? v.match(/^(\d+) days$/) : null;
  return <span>{days ? labels.days.replace("__COUNT__", days[1]) : v}</span>;
}

function BillingToggle({
  billing,
  setBilling,
  labels,
}: {
  billing: Billing;
  setBilling: (b: Billing) => void;
  labels: Labels;
}) {
  return (
    <div className="billing-toggle" role="group" aria-label={labels.billing}>
      <button
        type="button"
        className={billing === "yearly" ? "on" : ""}
        aria-pressed={billing === "yearly"}
        onClick={() => setBilling("yearly")}
      >
        {labels.yearly} <span className="billing-save">{labels.save}</span>
      </button>
      <button
        type="button"
        className={billing === "monthly" ? "on" : ""}
        aria-pressed={billing === "monthly"}
        onClick={() => setBilling("monthly")}
      >
        {labels.monthly}
      </button>
    </div>
  );
}

function PlanTable({
  cols,
  rows,
  billing,
  labels,
  featured = "Pro",
}: {
  cols: string[];
  rows: Row[];
  billing: Billing;
  labels: Labels;
  featured?: string;
}) {
  return (
    <>
      <div className="pal-table-wrap">
        <table className="pal-table">
          <thead>
            <tr>
              <th scope="col">{labels.subscription}</th>
              {cols.map((c) => (
                <th scope="col" key={c} className={c === featured ? "is-featured" : ""}>
                  {c === featured && (
                    <span className="pop-tag">{labels.popular}</span>
                  )}
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((v, i) => (
                  <td
                    key={i}
                    className={cols[i] === featured ? "is-featured" : ""}
                  >
                    {cell(v, billing, labels)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="cta-row">
              <th scope="row"></th>
              {cols.map((c) => (
                <td key={c} className={c === featured ? "is-featured" : ""}>
                  {c === "Free" ? null : (
                    <Link
                      href="/prelaunch"
                      className={`btn plan-choose${c === featured ? " is-dark" : ""}`}
                    >
                      {labels.choose.replace("__NAME__", c)}
                    </Link>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="pal-cards">
        {cols.map((col, ci) => (
          <article
            key={col}
            className={`tier-card${col === featured ? " featured" : ""}`}
          >
            <span className="kicker" style={{ color: "var(--gold)" }}>
              {col}
            </span>
            <div
              className="serif"
              style={{ fontSize: "1.5rem", margin: ".25rem 0 1rem" }}
            >
              {cell(rows[0].values[ci], billing, labels)}
            </div>
            <ul style={{ flex: 1, marginBottom: "1.5rem" }}>
              {rows.slice(1).map((row) => (
                <li
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    padding: ".5rem 0",
                    borderBottom: `1px solid ${col === featured ? "rgba(255,255,255,0.12)" : "var(--border)"}`,
                    fontSize: ".9rem",
                  }}
                >
                  <span
                    style={{
                      color:
                        col === featured
                          ? "rgba(255,255,255,0.7)"
                          : "var(--ink-3)",
                    }}
                  >
                    {row.label}
                  </span>
                  <span>{cell(row.values[ci], billing, labels)}</span>
                </li>
              ))}
            </ul>
            {col !== "Free" && (
              <Link
                href="/prelaunch"
                className="btn"
                style={{
                  background: col === featured ? "white" : "var(--ink)",
                  color: col === featured ? "var(--ink)" : "white",
                  textAlign: "center",
                }}
              >
                {labels.choose.replace("__NAME__", col)}
              </Link>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

export default function PlansContent() {
  const t = useTranslations("Plans");
  const [billing, setBilling] = useState<Billing>("yearly");
  const labels: Labels = {
    ...Object.fromEntries(
      [
        "billing",
        "yearly",
        "monthly",
        "save",
        "perMonth",
        "billedYearly",
        "billedMonthly",
        "subscription",
        "popular",
        "unlimited",
      ].map((key) => [key, t(key)]),
    ),
    choose: t("choose", { name: "__NAME__" }),
    days: t("days", { count: "__COUNT__" }),
  };
  const tabletRowsLocalized = tabletRows.map((row) => ({
    ...row,
    label: t(row.label),
  }));
  const palRowsLocalized = palRows.map((row) => ({
    ...row,
    label: t(row.label),
  }));

  return (
    <main
      className="editorial-page plans-page"
      style={{ paddingTop: "6rem", color: "var(--ink)" }}
    >
      <RevealObserver />

      <section
        className="container reveal"
        style={{ padding: "2rem 2rem 4rem", maxWidth: 1100 }}
      >
        <span className="kicker">{t("eyebrow")}</span>
        <Heading as="h1"
          className="lq-h1 serif"
          style={{ margin: "1rem 0 1.25rem", maxWidth: 760 }}
        >
          {t("title")}
        </Heading>
        <p className="lq-body" style={{ color: "var(--ink-2)", maxWidth: 560 }}>
          {t("intro")}
        </p>
      </section>

      <section className="container reveal" style={{ padding: "0 2rem 5rem" }}>
        <div className="hw-grid">
          {hardware.map((h) => (
            <article key={h.name} className="hw-card">
              <div
                className={`hw-img${h.imageFit !== "cover" ? ` hw-img-${h.imageFit}` : ""}`}
              >
                <Image
                  src={h.img}
                  alt={h.name}
                  width={900}
                  height={900}
                  sizes="(max-width: 820px) 100vw, 33vw"
                />
              </div>
              <Heading as="h3"
                className="serif"
                style={{
                  fontSize: "var(--lq-h3)",
                  margin: ".25rem 0 .35rem",
                }}
              >
                {h.name}
              </Heading>
              <p
                style={{
                  color: "var(--ink-3)",
                  fontSize: ".95rem",
                  marginBottom: "1.25rem",
                }}
              >
                {t(h.blurbKey)}
              </p>
              <div
                className={`hw-price serif${h.price === null ? " hw-price-pending" : ""}`}
              >
                {h.price === null ? (
                  t("pricePending")
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: ".6em",
                        color: "var(--gold)",
                        marginRight: ".4rem",
                        letterSpacing: ".08em",
                      }}
                    >
                      USD
                    </span>
                    {h.price}
                  </>
                )}
              </div>
              <div className="hw-actions">
                <Link
                  href="/prelaunch"
                  className="btn btn-navy hw-reserve"
                >
                  {t("reserve")}
                </Link>
                <Link href={h.href} className="hw-more">
                  {t("learn")}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        className="container reveal"
        style={{ padding: "0 2rem 2rem", textAlign: "center" }}
      >
        <BillingToggle
          billing={billing}
          setBilling={setBilling}
          labels={labels}
        />
      </section>

      <section
        className="container lq-section reveal"
        style={{ padding: "1rem 2rem 5rem" }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 720,
            margin: "0 auto 2.5rem",
          }}
        >
          <span className="kicker" style={{ justifyContent: "center" }}>
            {t("tabletKicker")}
          </span>
          <Heading as="h2" className="lq-h2 serif">{t("tabletTitle")}</Heading>
        </div>
        <PlanTable
          cols={tabletCols}
          rows={tabletRowsLocalized}
          billing={billing}
          labels={labels}
        />
      </section>

      <section
        className="container lq-section reveal"
        style={{ padding: "0 2rem 6rem" }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 720,
            margin: "0 auto 2.5rem",
          }}
        >
          <span className="kicker" style={{ justifyContent: "center" }}>
            {t("palKicker")}
          </span>
          <Heading as="h2" className="lq-h2 serif">{t("palTitle")}</Heading>
        </div>
        <PlanTable
          cols={palCols}
          rows={palRowsLocalized}
          billing={billing}
          labels={labels}
        />
      </section>

      <style>{`
        .hw-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5rem; }
        .hw-card { min-width: 0; background: #fff; border: 1px solid var(--border); border-radius: 20px; padding: 1.25rem 1.25rem 1.75rem; display: flex; flex-direction: column; transition: transform .4s, box-shadow .4s, border-color .4s; }
        .hw-card:hover { transform: translateY(-6px); box-shadow: var(--shadow-lg); border-color: var(--border-h); }
        .hw-img { aspect-ratio: 4/3; border-radius: 14px; overflow: hidden; margin-bottom: 1.25rem; background: rgba(255,255,255,.68); }
        .hw-img img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .8s ease; }
        .hw-img-contain-ola img, .hw-img-contain-print img { object-fit: contain; }
        .hw-img-contain-ola img { transform: scale(1.02); }
        .hw-img-contain-print img { transform: scale(1.08); }
        .hw-card:hover .hw-img img { transform: scale(1.05); }
        .hw-card:hover .hw-img-contain-ola img { transform: scale(1.02); }
        .hw-card:hover .hw-img-contain-print img { transform: scale(1.08); }
        .hw-price.serif { color: var(--ink); font-size: clamp(1.5rem, 2.4vw, 1.85rem); margin-bottom: 1.25rem; }
        .hw-price.serif.hw-price-pending { font-size: clamp(.95rem, 1.4vw, 1.05rem); line-height: 1.35; white-space: nowrap; }
        .hw-actions { display: flex; align-items: center; gap: .4rem; flex-wrap: nowrap; min-width: 0; margin-top: auto; }
        .hw-reserve { flex: 0 1 auto; min-width: 0; min-height: 44px; padding: .55rem .6rem; font-size: .76rem; white-space: nowrap; }
        .hw-more { display: inline-flex; align-items: center; flex: 0 0 auto; min-height: 44px; color: var(--ink-2); font-size: .78rem; font-weight: 500; white-space: nowrap; border-bottom: 1px solid var(--ink-4); transition: color .25s, border-color .25s; }
        .hw-more:hover { color: var(--ink); border-color: var(--ink); }

        .billing-toggle { display: inline-flex; border: 1px solid var(--border-h); border-radius: 999px; padding: 4px; background: #fff; }
        .billing-toggle button { border: 0; background: transparent; font: inherit; font-size: .9rem; font-weight: 500; color: var(--ink-3); padding: .55rem 1.4rem; border-radius: 999px; cursor: pointer; transition: background .3s, color .3s; display: inline-flex; align-items: center; gap: .5rem; }
        .billing-toggle button.on { background: var(--ink); color: #fff; }
        .billing-save { font-size: .6875rem; font-weight: 600; letter-spacing: .04em; color: var(--gold); }
        .billing-toggle button.on .billing-save { color: #E8CE8F; }

        .fee-cell { display: inline-flex; flex-direction: column; line-height: 1.25; }
        .fee-cell strong { font-size: 1.15rem; font-weight: 600; }
        .fee-cell em { font-style: normal; font-size: .7rem; color: var(--ink-3); letter-spacing: .04em; }
        .is-featured .fee-cell em { color: var(--ink-3); }

        .tier-card { background: #fff; color: var(--ink); border: 1px solid var(--border); border-radius: 16px; padding: 2rem 1.75rem; display: flex; flex-direction: column; }
        .tier-card.featured { background: var(--ink); color: white; border-color: transparent; }
        .tier-card.featured .fee-cell em { color: rgba(255,255,255,0.6); }

        .pal-table-wrap { display: block; overflow-x: auto; border: 1px solid var(--border); border-radius: 16px; }
        .pal-table { width: 100%; border-collapse: collapse; background: #fff; }
        .pal-table th, .pal-table td { padding: 1rem 1.1rem; text-align: center; border-bottom: 1px solid var(--border); font-size: .95rem; vertical-align: middle; }
        .pal-table thead th { font-family: var(--font-serif); font-size: 1.1rem; border-bottom: 1px solid var(--border-h); position: relative; padding-top: 1.4rem; padding-bottom: 1.4rem; }
        .pal-table tbody th { text-align: left; color: var(--ink-2); font-weight: 500; }
        .pal-table tbody tr:not(.cta-row):hover th, .pal-table tbody tr:not(.cta-row):hover td { background: rgba(240,245,252,.6); }
        .pal-table .is-featured { background: rgba(240,245,252,.6); }
        .pal-table thead .is-featured { background: var(--ink); color: white; }
        .pop-tag { display: block; font-family: var(--font-sans); font-size: .55rem; font-weight: 600; letter-spacing: .18em; text-transform: uppercase; color: #E8CE8F; margin-bottom: .3rem; }
        .pal-table .cta-row th, .pal-table .cta-row td { border-bottom: none; padding-top: 1.25rem; padding-bottom: 1.5rem; }
        .plan-choose { background: transparent; color: var(--ink); border: 1px solid var(--ink); padding: .5rem 1rem; font-size: .85rem; }
        .plan-choose:hover { background: var(--ink); color: #fff; transform: translateY(-2px); }
        .plan-choose.is-dark { background: var(--ink); color: #fff; border-color: var(--ink); }
        .plan-choose.is-dark:hover { background: #000; }

        .pal-cards { display: none; }
        @media (max-width: 1100px) { .hw-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 640px) { .hw-grid { grid-template-columns: 1fr; } .hw-reserve, .hw-more { font-size: .9rem; } .hw-reserve { padding-inline: 1rem; } }
        @media (max-width: 760px) { .pal-table-wrap { display: none; } .pal-cards { display: grid; gap: 1.5rem; grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
