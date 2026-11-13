"use client";

import {useId} from "react";
import {useTranslations} from "next-intl";
import Image from "@/components/content/ContentImage";
import {useVisualPreview} from "@/components/content/SiteContentProvider";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {orbSceneGeometry, sceneTriangles} from "@/lib/content/scene-projection";
import "@/app/orb-device-scene.css";

type SceneKind = "kitchen" | "closeup" | "overview" | "calendar" | "chores";
const projections = Object.fromEntries(Object.entries(orbSceneGeometry).map(([key, geometry]) => [key, {
  screen: sceneTriangles(1920, 1360, geometry.screen),
}]));

export default function OrbDeviceScene({screen, label, scene = "closeup"}: {
  screen: string;
  label: string;
  scene?: SceneKind;
}) {
  const cms = useContentAdapter();
  const visual = useVisualPreview();
  const sceneId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sceneUrls = {
    kitchen: cms.url("/assets/nest-detail/generated/nest-family-kitchen-v2.png"),
    closeup: cms.url("/assets/nest-detail/generated/nest-routine-closeup-v2.png"),
    overview: cms.url("/assets/product-scenes-20261103/orb-overview.webp"),
    calendar: cms.url("/assets/product-scenes-20261103/orb-calendar.webp"),
    chores: cms.url("/assets/product-scenes-20261103/orb-chores.webp"),
  };
  const t = useTranslations("BrandSceneDetails.orb");
  const kind = scene === "closeup" ? "closeup" : "kitchen";
  const suffix = "inline";
  return <div className="orb-device-scene" data-scene={scene}>
    <Image className="orb-scene-photo" src={sceneUrls[scene]} alt={t("sceneAlt", {screen:label})} width={1448} height={1086} sizes="(max-width: 900px) 100vw, 46vw" />
    <svg className="orb-scene-overlay" viewBox="0 0 1448 1086" aria-hidden="true">
      <defs>
        <image id={`${sceneId}-${suffix}-${kind}-screen`} href={cms.url(screen)} x="0" y="140" width="1920" height="1080" preserveAspectRatio="xMidYMid meet" />
      </defs>
      <polygon points={orbSceneGeometry[kind].screen.map(point => point.join(",")).join(" ")} fill="white" />
      {projections[kind].screen.map((tile, index) => <g key={`screen-${index}`} className="orb-scene-screen">
        <defs><clipPath id={`${sceneId}-${suffix}-${kind}-screen-${index}`}><polygon points={tile.clip} /></clipPath></defs>
        <g clipPath={`url(#${sceneId}-${suffix}-${kind}-screen-${index})`}><use href={`#${sceneId}-${suffix}-${kind}-screen`} transform={tile.transform} /></g>
      </g>)}
    </svg>
    {/* Preserve click-to-edit for the real screen in the authenticated CMS canvas. */}
    {visual && <Image className="orb-scene-edit-target" src={screen} alt={label} width={1920} height={1080} unoptimized style={{
      left:`${Math.min(...orbSceneGeometry[kind].screen.map(p=>p[0]))/1448*100}%`,
      top:`${Math.min(...orbSceneGeometry[kind].screen.map(p=>p[1]))/1086*100}%`,
      width:`${(Math.max(...orbSceneGeometry[kind].screen.map(p=>p[0]))-Math.min(...orbSceneGeometry[kind].screen.map(p=>p[0])))/1448*100}%`,
      height:`${(Math.max(...orbSceneGeometry[kind].screen.map(p=>p[1]))-Math.min(...orbSceneGeometry[kind].screen.map(p=>p[1])))/1086*100}%`,
    }} />}
  </div>;
}
