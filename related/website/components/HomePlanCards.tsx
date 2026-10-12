"use client";
import Heading from "@/components/Heading";


import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { PRODUCT_BY_ID } from "@/lib/products";

const hardwarePlansBase = [
  {
    index: "01",
    name: PRODUCT_BY_ID.tablet.name,
    price: "399",
    image: PRODUCT_BY_ID.tablet.image,
    href: PRODUCT_BY_ID.tablet.href,
    className: "plan-card-tablet",
  },
  {
    index: "02",
    name: PRODUCT_BY_ID.ola.name,
    price: "599",
    image: PRODUCT_BY_ID.ola.image,
    href: PRODUCT_BY_ID.ola.href,
    className: "plan-card-ola",
  },
  {
    index: "03",
    name: PRODUCT_BY_ID.print.name,
    price: "69",
    image: PRODUCT_BY_ID.print.image,
    href: PRODUCT_BY_ID.print.href,
    className: "plan-card-print",
  },
  {
    index: "04",
    name: PRODUCT_BY_ID.nest.name,
    price: null,
    image: PRODUCT_BY_ID.nest.image,
    href: PRODUCT_BY_ID.nest.href,
    className: "plan-card-nest",
  },
];

export default function PlanCards() {
  const t = useTranslations("HomePlans");
  const hardwarePlans = hardwarePlansBase.map((plan, index) => ({
    ...plan,
    type: t(`p${index + 1}Type`),
    description: t(`p${index + 1}Desc`),
  }));

  return (
    <div className="hardware-plan-grid">
      {hardwarePlans.map((plan) => (
        <Link
          href={plan.href}
          className={`hardware-plan-card ${plan.className}`}
          key={plan.name}
          aria-label={t("explore", {
            name: plan.name.replace("Lumiq ", ""),
          })}
        >
          <div className="hardware-plan-visual">
            <span aria-hidden="true">{plan.index}</span>
            <Image
              src={plan.image}
              alt={t("frontAlt", { name: plan.name })}
              width={900}
              height={900}
              sizes="(max-width: 820px) 100vw, 33vw"
            />
          </div>
          <div className="hardware-plan-copy">
            <p className="eyebrow">{plan.type}</p>
            <Heading as="h3">{plan.name}</Heading>
            <p>{plan.description}</p>
            <div className="hardware-plan-purchase">
              <p className={plan.price === null ? "is-pending" : undefined}>
                {plan.price === null ? (
                  <strong>{t("pricePending")}</strong>
                ) : (
                  <>
                    <span>USD</span>
                    <strong>{plan.price}</strong>
                  </>
                )}
              </p>
              <span className="hardware-plan-explore">
                {t("explore", { name: plan.name.replace("Lumiq ", "") })}{" "}
                <span aria-hidden="true">→</span>
              </span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
