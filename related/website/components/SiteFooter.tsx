"use client";
import Heading from "@/components/Heading";


import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { PRODUCT_CATALOG } from "@/lib/products";
import Image from "next/image";

export default function SiteFooter() {
  const t = useTranslations("Footer");
  const isHomepage = usePathname() === "/";

  // One set of destinations, with columns on desktop and native accordions on phones.
  const groups = [
    {id: "products", title: t("products"), content: <ul>
      {PRODUCT_CATALOG.map(product => <li key={product.id}><Link prefetch={false} href={product.href}>{isHomepage ? product.name.replace(/lumiq/gi, "LUMIQ") : product.name}</Link></li>)}
      <li><Link prefetch={false} href="/plans">{t("plansPricing")}</Link></li>
    </ul>},
    {id: "company", title: t("company"), content: <ul>
      <li><Link prefetch={false} href="/about">{t("about")}</Link></li>
      <li><Link prefetch={false} href="/story">{t("brandStory")}</Link></li>
      <li><Link prefetch={false} href="/contact">{t("contact")}</Link></li>
    </ul>},
    {id: "legal", title: t("legal"), content: <ul>
      <li><Link prefetch={false} href="/legal/privacy">{t("privacy")}</Link></li>
      <li><Link prefetch={false} href="/legal/terms">{t("terms")}</Link></li>
      <li><Link prefetch={false} href="/legal/cookies">{t("cookies")}</Link></li>
      <li><Link prefetch={false} href="/legal/child-safety">{t("childSafety")}</Link></li>
    </ul>},
    {id: "follow", title: t("follow"), content: <div className="pending-link-list">
      <span>Instagram</span><span>TikTok</span><span>YouTube</span>
      <small>{t("linksPending")}</small>
    </div>},
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="foot-logo">
              <Image
                src="/assets/brand/lumiq-logo-transparent-dark.png"
                alt={isHomepage ? "LUMIQ Studio" : "LumiQ Studio"}
                className="foot-logo-img"
                width={360}
                height={96}
              />
              <Image src="/assets/brand/lumiq-logo-white-transparent-v2.png" alt="" className="foot-logo-img foot-logo-light" width={360} height={96} />
            </div>
            <span className="foot-mobile-tag">{t("tagline")}</span>
            <p className="foot-blurb">{isHomepage ? t("blurb").replace(/lumiq/gi, "LUMIQ") : t("blurb")}</p>
            <details className="foot-brand-details">
              <summary>{t("about")}<span aria-hidden="true" /></summary>
              <p>{isHomepage ? t("blurb").replace(/lumiq/gi, "LUMIQ") : t("blurb")}</p>
            </details>
          </div>
          {groups.map(group => <div className="foot-nav" key={group.id}>
            <Heading as="h4">{group.title}</Heading>
            {group.content}
          </div>)}
          <div className="foot-mobile-nav">
            {groups.map(group => <details key={group.id}>
              <summary>{group.title}<span aria-hidden="true" /></summary>
              {group.content}
            </details>)}
          </div>
        </div>
        <div className="foot-bottom">
          <div>{t("rights")}</div>
          <div className="foot-tag">{t("tagline")}</div>
        </div>
      </div>
    </footer>
  );
}
