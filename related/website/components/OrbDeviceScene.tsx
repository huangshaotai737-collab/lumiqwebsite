"use client";

import {useId, useRef} from "react";
import {useTranslations} from "next-intl";
import Image from "@/components/content/ContentImage";
import {useVisualPreview} from "@/components/content/SiteContentProvider";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {orbSceneGeometry, sceneTriangles} from "@/lib/content/scene-projection";
import "@/app/orb-device-scene.css";

type SceneKind = "kitchen" | "closeup";
const projections = Object.fromEntries(Object.entries(orbSceneGeometry).map(([key, geometry]) => [key, {
  screen: sceneTriangles(1920, 1360, geometry.screen),
  frame: sceneTriangles(1112, 678, geometry.frame),
}]));

export default function OrbDeviceScene({screen, label, scene = "closeup", finish, expandable = false}: {
  screen: string;
  label: string;
  scene?: SceneKind;
  finish?: string;
  expandable?: boolean;
}) {
  const cms = useContentAdapter();
  const visual = useVisualPreview();
  const sceneId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sceneUrls = {
    kitchen: cms.url("/assets/nest-detail/generated/nest-family-kitchen-v2.png"),
    closeup: cms.url("/assets/nest-detail/generated/nest-routine-closeup-v2.png"),
  };
  const t = useTranslations("BrandSceneDetails.orb");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const draw = (kind: SceneKind, suffix = "inline") => <div className="orb-device-scene" data-scene={kind}>
    <Image className="orb-scene-photo" src={sceneUrls[kind]} alt={t("sceneAlt", {screen:label})} width={1448} height={1086} sizes="(max-width: 900px) 100vw, 46vw" />
    <svg className="orb-scene-overlay" viewBox="0 0 1448 1086" aria-hidden="true">
      <defs>
        <image id={`${sceneId}-${suffix}-${kind}-screen`} href={cms.url(screen)} x="0" y="140" width="1920" height="1080" preserveAspectRatio="xMidYMid meet" />
        {finish && <image id={`${sceneId}-${suffix}-${kind}-frame`} href={finish} x="-44" y="-266" width="1200" height="1200" />}
      </defs>
      {finish && projections[kind].frame.map((tile, index) => <g key={`frame-${index}`} className="orb-scene-frame">
        <defs><clipPath id={`${sceneId}-${suffix}-${kind}-frame-${index}`}><polygon points={tile.clip} /></clipPath></defs>
        <g clipPath={`url(#${sceneId}-${suffix}-${kind}-frame-${index})`}><use href={`#${sceneId}-${suffix}-${kind}-frame`} transform={tile.transform} /></g>
      </g>)}
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
  return <div className="orb-scene-view">
    {draw(scene)}
    {expandable && <>
      <button ref={trigger} className="orb-scene-expand" type="button" onClick={() => dialog.current?.showModal()}>{t("closeup")} <span aria-hidden="true">↗</span></button>
      <dialog ref={dialog} className="orb-scene-dialog" aria-label={label} onClose={() => trigger.current?.focus({preventScroll:true})} onClick={event => {if(event.target === event.currentTarget) dialog.current?.close();}}>
        <form method="dialog"><button autoFocus aria-label={t("close")} type="submit">×</button></form>
        {draw("closeup", "dialog")}
        <p>{label}</p>
      </dialog>
    </>}
  </div>;
}
