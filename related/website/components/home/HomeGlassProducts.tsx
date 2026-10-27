"use client";
import {homeWideQuery} from "./responsiveLayout";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { GlassProduct } from "./GlassCards";
import "./critical-loading.css";

const loadGlassCanvas = () => import("./GlassCards").then(m => m.GlassCanvas);
const GlassCanvas = dynamic(loadGlassCanvas, { ssr: false });

export default function HomeGlassProducts({ products }: { products: GlassProduct[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(0);
  const handoffTimer = useRef<number | null>(null);
  useEffect(() => {
    const element = host.current!;
    const section = element.closest<HTMLElement>(".lh-products")!;
    const desktop = matchMedia(homeWideQuery);
    let near = false;
    let visible = false;
    let supported: boolean | undefined;
    const cancelHandoff = () => {
      if (handoffTimer.current !== null) window.clearTimeout(handoffTimer.current);
      handoffTimer.current = null;
      section.removeAttribute("data-glass-revealing");
    };
    const sync = () => setSelected(Number(section.dataset.activeProduct || 0));
    const syncRunning = () => setRunning(visible && desktop.matches && !document.hidden);
    const configure = () => {
      // IO notifications can describe an earlier resize frame. Read the settled
      // slot again before allocating a renderer after the scroll pins rebuild.
      const bounds = element.getBoundingClientRect();
      const visibleHeight = Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, 0));
      visible = bounds.width > 0 && visibleHeight > 0;
      syncRunning();
      // Reserve layout from the first render; show only the completed mirror scene.
      if (!desktop.matches) { cancelHandoff(); setEnabled(false); section.removeAttribute("data-glass-3d"); return; }
      if (near) void loadGlassCanvas().catch(failed);
      // Loading the component is cheap; creating its GPU context and scene is
      // not. A phone-to-desktop resize at films must not initialize hidden glass.
      if (!visible) return;
      if (supported === undefined) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2");
        supported = Boolean(context);
        context?.getExtension("WEBGL_lose_context")?.loseContext();
      }
      section.toggleAttribute("data-glass-fallback", !supported);
      setEnabled(supported);
    };
    const failed = () => {
      cancelHandoff();
      section.setAttribute("data-glass-fallback", "");
      supported = false;
      setEnabled(false);
      section.removeAttribute("data-glass-3d");
    };
    element.addEventListener("webglcontextlost", failed, true);
    const observer = new MutationObserver(sync);
    observer.observe(section, { attributes: true, attributeFilter: ["data-active-product"] });
    const preload = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      configure();
    }, { rootMargin: "1200px 0px" });
    // Preload nearby artwork, but render only while the actual canvas slot is
    // on screen. The loading margin extends into the following films chapter.
    const visibility = new IntersectionObserver(configure);
    preload.observe(section); visibility.observe(element);
    document.addEventListener("visibilitychange", syncRunning);
    desktop.addEventListener("change", configure); sync();
    return () => { cancelHandoff(); element.removeEventListener("webglcontextlost", failed, true); observer.disconnect(); preload.disconnect(); visibility.disconnect(); document.removeEventListener("visibilitychange", syncRunning); desktop.removeEventListener("change", configure); section.removeAttribute("data-glass-3d"); };
  }, []);
  const ready = () => {
    // The completed mirror scene fades into its reserved slot. A pending
    // frame must not re-enable it after a mobile resize or unmount.
    const section = host.current?.closest<HTMLElement>(".lh-products");
    if (!section || !matchMedia(homeWideQuery).matches || !host.current?.querySelector("canvas") ||
      section.hasAttribute("data-glass-3d") || section.hasAttribute("data-glass-revealing")) return;
    section.setAttribute("data-glass-revealing", "");
    handoffTimer.current = window.setTimeout(() => {
      handoffTimer.current = null;
      if (!host.current?.isConnected || !matchMedia(homeWideQuery).matches) return;
      section.setAttribute("data-glass-3d", "");
      section.removeAttribute("data-glass-revealing");
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 320);
  };
  const select = (index: number) => host.current?.dispatchEvent(new CustomEvent("lumiq:product-select", { bubbles: true, detail: index }));
  return <div ref={host} className="lh-glass-products" onKeyDown={e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault(); select((selected + (e.key === "ArrowRight" ? 1 : products.length - 1)) % products.length);
  }}>
    {enabled && <GlassCanvas selected={selected} select={select} products={products} carousel running={running} onReady={ready} />}
  </div>;
}
