"use client";
import {homeWideQuery} from "./responsiveLayout";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { GlassProduct } from "./GlassCards";
import "./critical-loading.css";

const GlassCanvas = dynamic(() => import("./GlassCards").then(m => m.GlassCanvas), { ssr: false });

export default function HomeGlassProducts({ products }: { products: GlassProduct[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const element = host.current!;
    const section = element.closest<HTMLElement>(".lh-products")!;
    const desktop = matchMedia(homeWideQuery);
    let near = false;
    let supported: boolean | undefined;
    const sync = () => setSelected(Number(section.dataset.activeProduct || 0));
    const configure = () => {
      // The CSS slot is reserved from the first render, but normal product links
      // remain visible until the renderer has its first complete scene.
      if (!desktop.matches) { setEnabled(false); section.removeAttribute("data-glass-3d"); return; }
      if (!near) return;
      if (supported === undefined) {
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("webgl2");
        supported = Boolean(context);
        context?.getExtension("WEBGL_lose_context")?.loseContext();
      }
      setEnabled(supported);
    };
    const failed = () => {
      supported = false;
      setEnabled(false);
      section.removeAttribute("data-glass-3d");
    };
    element.addEventListener("webglcontextlost", failed, true);
    const observer = new MutationObserver(sync);
    observer.observe(section, { attributes: true, attributeFilter: ["data-active-product"] });
    const visibility = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting;
      setRunning(near);
      configure();
    }, { rootMargin: "600px 0px" });
    visibility.observe(section); desktop.addEventListener("change", configure); sync();
    return () => { element.removeEventListener("webglcontextlost", failed, true); observer.disconnect(); visibility.disconnect(); desktop.removeEventListener("change", configure); section.removeAttribute("data-glass-3d"); };
  }, []);
  const ready = () => {
    // A pending frame must not re-enable the canvas after a mobile resize/unmount.
    if (matchMedia(homeWideQuery).matches && host.current?.querySelector("canvas")) {
      host.current.closest(".lh-products")?.setAttribute("data-glass-3d", "");
    }
  };
  const select = (index: number) => host.current?.dispatchEvent(new CustomEvent("lumiq:product-select", { bubbles: true, detail: index }));
  return <div ref={host} className="lh-glass-products" onKeyDown={e => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault(); select((selected + (e.key === "ArrowRight" ? 1 : products.length - 1)) % products.length);
  }}>
    {enabled && <GlassCanvas selected={selected} select={select} products={products} carousel running={running} onReady={ready} />}
  </div>;
}
