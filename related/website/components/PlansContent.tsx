"use client";

import Heading from "@/components/Heading";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent } from "react";
import Image from "@/components/content/ContentImage";
import RevealObserver from "@/components/RevealObserver";
import { useContentAdapter } from "@/components/content/useContentAdapter";
import { parsePlanPrice, type PlanPrice } from "@/lib/plan-price";

type Billing = "yearly" | "monthly";
type ProductTab = "one" | "tablet" | "ola";
type Price = PlanPrice;
type PlanValue = string | boolean | Price;
type Row = { id: string; label: string; values: PlanValue[] };
type Column = { id: string; name: string; description: string; free: boolean };
type Labels = Record<string, string>;
const PRODUCT_TABS: ProductTab[] = ["one", "tablet", "ola"];

function cell(value: PlanValue, billing: Billing, labels: Labels) {
  if (typeof value === "boolean") {
    return (
      <span className={value ? "plan-included" : "plan-unavailable"}>
        <span aria-hidden="true">{value ? "✓" : "—"}</span>
        <span className="plan-sr-only">{value ? labels.included : labels.notIncluded}</span>
      </span>
    );
  }
  const price = typeof value === "object" ? value : parsePlanPrice(value);
  if (price) {
    const amount = `$${price[billing]}`;
    return (
      <span className="fee-cell">
        <span className="plan-fee-amount"><strong className="serif">{amount}</strong> {billing === "yearly" ? labels.perYear : labels.perMonth}</span>
        <em>{billing === "yearly" ? labels.annualTotal.replace("__AMOUNT__", amount) : labels.billedMonthly}</em>
      </span>
    );
  }
  if (value === "Unlimited") return <span>{labels.unlimited}</span>;
  const days = typeof value === "string" ? value.match(/^(\d+) days$/) : null;
  const minutes = typeof value === "string" ? value.match(/^(\d+) min \/ month$/) : null;
  return <span>{days ? labels.days.replace("__COUNT__", days[1]) : minutes ? labels.minutesPerMonth.replace("__COUNT__", minutes[1]) : typeof value === "string" ? value : ""}</span>;
}

function BillingToggle({ billing, setBilling, labels }: { billing: Billing; setBilling: (value: Billing) => void; labels: Labels }) {
  return (
    <div className="billing-toggle" role="group" aria-label={labels.billing}>
      <button type="button" className={billing === "yearly" ? "on" : ""} aria-pressed={billing === "yearly"} onClick={() => setBilling("yearly")}>
        {labels.yearly} <span className="billing-save">{labels.save}</span>
      </button>
      <button type="button" className={billing === "monthly" ? "on" : ""} aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>
        {labels.monthly}
      </button>
    </div>
  );
}

function PlanTable({ id, columns, rows, billing, labels, caption, featured = "Pro" }: { id: string; columns: Column[]; rows: Row[]; billing: Billing; labels: Labels; caption: string; featured?: string }) {
  const priceRow = rows.find(row => row.id === "monthlyFee");
  const featureRows = rows.filter(row => row.id !== "monthlyFee");
  return (
    <>
      <div className="pal-table-wrap">
        <table className="pal-table">
          <caption className="plan-sr-only">{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{labels.subscription}</th>
              {columns.map(column => (
                <th scope="col" key={column.id} className={column.id === featured ? "is-featured" : ""}>
                  {column.id === featured && <span className="pop-tag">{labels.popular}</span>}
                  {column.name}
                  <span className="plan-tier-description">{column.description}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <th scope="row">{row.label}</th>
                {row.values.map((value, index) => (
                  <td key={columns[index].id} className={columns[index].id === featured ? "is-featured" : ""}>{cell(value, billing, labels)}</td>
                ))}
              </tr>
            ))}
            <tr className="cta-row">
              <th scope="row"><span className="plan-sr-only">{labels.choose}</span></th>
              {columns.map(column => (
                <td key={column.id} className={column.id === featured ? "is-featured" : ""}>
                  {!column.free && <Link href="/prelaunch" className={`btn plan-choose${column.id === featured ? " is-dark" : ""}`}>{labels.choose.replace("__NAME__", column.name)}</Link>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="pal-cards">
        {columns.map((column, index) => (
          <article key={column.id} className={`tier-card${column.id === featured ? " featured" : ""}`} aria-labelledby={`${id}-${column.id}-title`}>
            <Heading as="h3" id={`${id}-${column.id}-title`} className="kicker plan-tier-title">{column.name}</Heading>
            <p className="plan-tier-description">{column.description}</p>
            {priceRow && <div className="plan-card-price serif">{cell(priceRow.values[index], billing, labels)}</div>}
            <ul className="plan-list">
              {featureRows.map(row => <li key={row.id}><span>{row.label}</span><span>{cell(row.values[index], billing, labels)}</span></li>)}
            </ul>
            {!column.free && <Link href="/prelaunch" className="btn plan-choose is-dark">{labels.choose.replace("__NAME__", column.name)}</Link>}
          </article>
        ))}
      </div>
    </>
  );
}

export default function PlansContent() {
  const cms = useContentAdapter();
  const t = useTranslations("Plans");
  const brand = useTranslations("BrandPlans");
  const all = useTranslations();
  const [billing, setBilling] = useState<Billing>("yearly");
  const [activeTab, setActiveTab] = useState<ProductTab>("one");
  const tabRefs = useRef<Partial<Record<ProductTab, HTMLButtonElement | null>>>({});
  const tablet = cms.snapshot.plans.find(plan => plan.group === "tablet")!;
  const ola = cms.snapshot.plans.find(plan => plan.group === "ola")!;
  const labels: Labels = {
    ...Object.fromEntries(["billing", "yearly", "monthly", "save", "perMonth", "billedYearly", "billedMonthly", "subscription", "popular", "unlimited"].map(key => [key, t(key)])),
    choose: t("choose", { name: "__NAME__" }),
    days: t("days", { count: "__COUNT__" }),
    perYear: brand("perYear"),
    annualTotal: brand("annualTotal", { amount: "__AMOUNT__" }),
    minutesPerMonth: brand("ola.minutesPerMonth", { count: "__COUNT__" }),
    included: brand("included"),
    notIncluded: brand("notIncluded"),
  };
  const tabletColumns = tablet.tiers.map((name, index) => ({ id: ["Free", "Lite", "Pro"][index], name, description: brand(`tierDescriptions.${["tabletFree", "tabletLite", "tabletPro"][index]}`), free: index === 0 }));
  // Stable source indexes retain existing editable CMS values and plan identities.
  const olaIndexes = [0, 2];
  const olaColumns = olaIndexes.map((index, displayIndex) => ({ id: displayIndex === 0 ? "Free" : "Pro", name: ola.tiers[index], description: brand(`tierDescriptions.${displayIndex === 0 ? "olaFree" : "olaPro"}`), free: displayIndex === 0 }));
  const tabletRows: Row[] = tablet.rows.filter(row => !["reimagined", "storyQuest"].includes(row.id)).map(row => ({ id: row.id, label: all(row.labelKey), values: row.values }));
  tabletRows.push({ id: "connectOla", label: brand("tablet.connect"), values: tabletColumns.map(() => brand("tablet.connection")) });
  const olaRows: Row[] = ola.rows.filter(row => ["monthlyFee", "freeTrial", "character", "dayLimit"].includes(row.id)).map(row => ({ id: row.id, label: all(row.labelKey), values: olaIndexes.map(index => row.values[index]) }));
  olaRows.push({ id: "activeDetection", label: brand("ola.activeDetection"), values: [brand("ola.freeDetection"), brand("ola.proDetection")] });
  const oneColumns: Column[] = [{ id: "one", name: brand("one.name"), description: brand("tierDescriptions.one"), free: false }];
  const oneRows: Row[] = [
    { id: "monthlyFee", label: t("monthlyFee"), values: [{ monthly: brand("prices.one.monthly"), yearly: brand("prices.one.yearly") }] },
    { id: "freeTrial", label: t("freeTrial"), values: [brand("one.trial")] },
    { id: "tablet", label: brand("one.tablet"), values: [brand("one.tabletIncluded")] },
    { id: "ola", label: brand("one.ola"), values: [brand("one.olaIncluded")] },
  ];
  const hardware = (["tablet", "ola", "print", "nest"] as const).map((id, index) => {
    const product = cms.snapshot.products[id];
    return { id, name: product.name, price: product.price.kind === "usd" ? String(product.price.amount) : null, img: cms.url(product.image), href: product.href, imageFit: ["cover", "contain-ola", "contain-print", "cover"][index], blurbKey: ["tabletBlurb", "palBlurb", "printBlurb", "nestBlurb"][index], msrp: id === "tablet" ? brand("hardware.tabletMsrp") : id === "ola" ? brand("hardware.olaMsrp") : null };
  });
  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, tab: ProductTab) {
    const index = PRODUCT_TABS.indexOf(tab);
    const next = event.key === "ArrowRight" ? PRODUCT_TABS[(index + 1) % PRODUCT_TABS.length] : event.key === "ArrowLeft" ? PRODUCT_TABS[(index - 1 + PRODUCT_TABS.length) % PRODUCT_TABS.length] : event.key === "Home" ? PRODUCT_TABS[0] : event.key === "End" ? PRODUCT_TABS[PRODUCT_TABS.length - 1] : null;
    if (!next) return;
    event.preventDefault();
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  }
  const panels = [
    { id: "one" as const, kicker: brand("one.kicker"), title: brand("one.title"), audience: brand("one.intro"), columns: oneColumns, rows: oneRows, featured: "one" },
    { id: "tablet" as const, kicker: t("tabletKicker"), title: t("tabletTitle"), audience: brand("tablet.audience"), columns: tabletColumns, rows: tabletRows, featured: "Pro" },
    { id: "ola" as const, kicker: t("palKicker"), title: t("palTitle"), audience: brand("ola.audience"), columns: olaColumns, rows: olaRows, featured: "Pro" },
  ];

  return (
    <main className="editorial-page plans-page brand-plans-page">
      <RevealObserver />
      <section className="container plans-intro">
        <span className="kicker">{t("eyebrow")}</span>
        <Heading as="h1" className="lq-h1 serif">{t("title")}</Heading>
        <p className="lq-body">{t("intro")}</p>
        <p className="plans-preview-notice"><strong>{brand("previewLabel")}</strong> {brand("previewNotice")}</p>
      </section>
      <section className="container reveal plans-hardware" aria-label={t("title")}>
        <div className="hw-grid">
          {hardware.map(item => (
            <article key={item.id} className="hw-card" data-product={item.id}>
              <div className={`hw-img${item.imageFit !== "cover" ? ` hw-img-${item.imageFit}` : ""}`}><Image src={item.img} alt={item.name} width={900} height={900} sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 25vw" /></div>
              <Heading as="h2" className="serif hw-name">{item.name}</Heading>
              <p className="hw-copy">{t(item.blurbKey)}</p>
              {item.msrp && <p className="hw-msrp">{brand("hardware.msrp")} <span>USD {item.msrp}</span></p>}
              <div className={`hw-price serif${item.price === null ? " hw-price-pending" : ""}`}>
                {item.price === null ? t("pricePending") : <>{item.msrp && <span className="hw-price-label">{brand("hardware.vip")}</span>}<span className="hw-currency">USD</span> {item.price}</>}
              </div>
              <div className="hw-actions"><Link href="/prelaunch" className="btn btn-navy hw-reserve">{t("reserve")}</Link><Link href={item.href} className="hw-more">{t("learn")}</Link></div>
            </article>
          ))}
        </div>
      </section>
      <section className="container plans-comparison">
        <div className="plans-product-tabs" role="tablist" aria-label={brand("productTabs")}>
          {PRODUCT_TABS.map(tab => <button key={tab} ref={node => { tabRefs.current[tab] = node; }} id={`plans-tab-${tab}`} type="button" role="tab" aria-controls={`plans-panel-${tab}`} aria-selected={activeTab === tab} tabIndex={activeTab === tab ? 0 : -1} className={activeTab === tab ? "on" : ""} onClick={() => setActiveTab(tab)} onKeyDown={event => handleTabKey(event, tab)}>{brand(`tabs.${tab}`)}</button>)}
        </div>
        <div className="plans-billing"><BillingToggle billing={billing} setBilling={setBilling} labels={labels} /></div>
        {panels.map(panel => (
          <div key={panel.id} id={`plans-panel-${panel.id}`} role="tabpanel" aria-labelledby={`plans-tab-${panel.id}`} hidden={activeTab !== panel.id} tabIndex={0} className="plans-product-panel">
            <div className="plans-panel-heading"><span className="kicker">{panel.kicker}</span><Heading as="h2" className="lq-h2 serif">{panel.title}</Heading><p>{panel.audience}</p></div>
            <PlanTable id={panel.id} columns={panel.columns} rows={panel.rows} billing={billing} labels={labels} caption={`${panel.title} — ${billing === "yearly" ? labels.billedYearly : labels.billedMonthly}`} featured={panel.featured} />
          </div>
        ))}
        <p className="plans-trial-notice">{brand("trialNotice")}</p>
      </section>
    </main>
  );
}
