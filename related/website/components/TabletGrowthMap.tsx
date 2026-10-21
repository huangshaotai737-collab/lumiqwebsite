"use client";

import { useTranslations } from "next-intl";
import Heading from "@/components/Heading";

export default function TabletGrowthMap() {
  const t = useTranslations("BrandTablet");

  return (
    <section className="pd-floor tablet-growth-map" aria-labelledby="tablet-growth-title">
      <div className="pd-shell">
        <header className="pd-section-heading is-center">
          <p className="pd-eyebrow">{t("growth.eyebrow")}</p>
          <Heading as="h2" id="tablet-growth-title">{t("growth.title")}</Heading>
          <p className="pd-section-intro">{t("growth.body")}</p>
          <p className="tablet-growth-summary">{t("growth.summary")}</p>
        </header>

        <div className="tablet-growth-skills">
          {[1, 2, 3, 4, 5, 6].map((number) => (
            <article className={`tablet-growth-skill tablet-growth-skill-${number}`} key={number}>
              <span className="tablet-growth-number" aria-hidden="true">{number}</span>
              <div className="tablet-growth-skill-copy">
                <Heading as="h3">{t(`growth.skill${number}Title`)}</Heading>
                <p className="tablet-growth-skill-label">{t(`growth.skill${number}Label`)}</p>
                <p className="tablet-growth-skill-body">{t(`growth.skill${number}Body`)}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="tablet-growth-stages" aria-labelledby="tablet-growth-stages-title">
          <header className="tablet-growth-stages-heading">
            <p className="pd-eyebrow">{t("growth.stagesEyebrow")}</p>
            <Heading as="h3" id="tablet-growth-stages-title">{t("growth.stagesTitle")}</Heading>
          </header>
          <ol className="tablet-growth-stage-list">
            {[1, 2, 3, 4].map((number) => (
              <li key={number}>
                <p className="tablet-growth-stage-age">{t(`growth.stage${number}Age`)}</p>
                <Heading as="h4">{t(`growth.stage${number}Title`)}</Heading>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
