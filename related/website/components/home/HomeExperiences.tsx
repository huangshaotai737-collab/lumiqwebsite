"use client";
import Heading from "@/components/Heading";

import Image from "@/components/home/HomeImage";
import { useTranslations } from "next-intl";
import { useState, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";

// 产品、预合成光晕与短连接线共用同一背景坐标，缩放时保持比例。
const products = [
  { id: "tablet", x: 44, y: 21, tx: 47, ty: 42 },
  { id: "ola", x: 86, y: 21, tx: 83, ty: 41 },
  { id: "print", x: 44, y: 84, tx: 48, ty: 66 },
  { id: "ola-go", x: 65, y: 84, tx: 65, ty: 73 },
  { id: "nest", x: 86, y: 84, tx: 80, ty: 66 },
] as const;

export default function HomeExperiences() {
  const t = useTranslations("HomeRefresh");
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className="lh-room-layout">
      <div className="lh-room-heading" data-home-reveal>
        <Heading as="h2" id="experiences-title">{t("roomHeading.line1")}<br />{t("roomHeading.line2")}<br />{t("roomHeading.line3")}</Heading>
        <p className="lh-room-intro">{t("experienceBody")}</p>
      </div>
      <div className="lh-room-map">
        <div className="lh-room-canvas">
          <div className="lh-room-background">
            <Image src="/assets/home-rooms-20260907/room-full-4k.webp" alt={t("houseAlt")} fill sizes="(max-width: 1199px) 154vw, (min-width: 1920px) 1920px, 100vw" quality={95} />
          </div>
          <svg className="lh-room-lines" viewBox="0 0 1000 562.5" aria-hidden="true">
            <defs>
              {products.map(({id,x,y,tx,ty}) => (
                <linearGradient key={id} id={`room-light-${id}`} gradientUnits="userSpaceOnUse" x1={x*10} y1={y*5.625} x2={tx*10} y2={ty*5.625}>
                  <stop offset="0" stopColor="white" stopOpacity="0" />
                  <stop offset=".36" stopColor="white" stopOpacity=".9" />
                  <stop offset="1" stopColor="#d6eaff" stopOpacity="0" />
                </linearGradient>
              ))}
            </defs>
            {products.map(({id,x,y,tx,ty}) => (
              <g key={id} data-active={active === id}>
                <path className="lh-room-beam" stroke={`url(#room-light-${id})`} d={`M ${x*10} ${y*5.625} L ${tx*10} ${ty*5.625}`} />
                <path stroke={`url(#room-light-${id})`} d={`M ${x*10} ${y*5.625} L ${tx*10} ${ty*5.625}`} />
              </g>
            ))}
          </svg>
          <div className="lh-room-products" role="group" aria-label={t("roomExplore")}>
            {products.map(({id,x,y}) => (
              <Link prefetch={false} key={id} href={`/products/${id}`} className={`lh-room-product lh-room-product-${id}`}
                style={{"--room-x":`${x}%`,"--room-y":`${y}%`} as CSSProperties}
                aria-label={`${t(`products.${id}.name`)} · ${t(`roomLabels.${id}.title`)} ${t(`roomLabels.${id}.subtitle`)}`}
                onMouseEnter={()=>setActive(id)} onMouseLeave={()=>setActive(null)} onFocus={()=>setActive(id)} onBlur={()=>setActive(null)}>
                <span className="lh-room-product-art">
                  <Image src={`/assets/home-premium-20260907/${id}-halo.webp`} alt="" fill sizes="(max-width: 767px) 94px, (max-width: 1199px) 130px, 190px" quality={95} />
                </span>
                <span className="lh-room-label"><span>{t(`roomLabels.${id}.title`)}</span><small>{t(`roomLabels.${id}.subtitle`)}</small></span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="lh-room-mobile-links" aria-label={t("roomExplore")}>
        {products.map(({id}) => (
          <Link prefetch={false} href={`/products/${id}`} key={id}>
            <strong>{t(`products.${id}.name`)}</strong>
            <span>{t(`roomLabels.${id}.title`)} {t(`roomLabels.${id}.subtitle`)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
