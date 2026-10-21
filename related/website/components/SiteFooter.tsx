"use client";
import {useSitePathname} from "@/components/content/useSitePathname";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {productCatalogue} from "@/lib/products";
import Heading from "@/components/Heading";


import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "@/components/content/ContentImage";
import {safeContentUrl} from '@/lib/generated/platform/content-validation';

export default function SiteFooter() {
  const cms = useContentAdapter();
  const t = useTranslations("Footer");
  const brand = useTranslations('BrandFooter');
  const socialUrl=(key:string)=>{const url=brand(key);return url.startsWith('https://')&&safeContentUrl(url,false)?url:undefined;};
  const isHomepage = useSitePathname() === "/";

  // One set of destinations, with columns on desktop and native accordions on phones.
  const groups = [
    {id: "products", title: t("products"), content: <ul>
      {productCatalogue(cms.snapshot).map(product => <li key={product.id}><Link prefetch={false} href={product.href}>{product.name}</Link></li>)}
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
      <a href={socialUrl('instagramUrl')} target="_blank" rel="noopener noreferrer">{cms.text("field_389fc243fbdfc7f9")}</a>
      <a href={socialUrl('facebookUrl')} target="_blank" rel="noopener noreferrer">{brand('facebook')}</a>
      <a href={socialUrl('tiktokUrl')} target="_blank" rel="noopener noreferrer">{cms.text("field_1fa422a74ad018b8")}</a>
      <a href={socialUrl('youtubeUrl')} target="_blank" rel="noopener noreferrer">{cms.text("field_3b5f5243c3798ce2")}</a>
    </div>},
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="foot-logo">
              <Image
                src={cms.url("/assets/brand/lumiq-logo-transparent-dark.png")}
                alt={isHomepage ? cms.text("field_f9f5468863713928") : cms.text("field_a291c2c8ec1af322")}
                className="foot-logo-img"
                width={360}
                height={96}
              />
              <Image src={cms.url("/assets/brand/lumiq-logo-white-transparent-v2.png")} alt="" className="foot-logo-img foot-logo-light" width={360} height={96} />
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
