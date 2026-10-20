"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {homeMotionQuery} from "./responsiveLayout";

import { useEffect, useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountProductRail } from "./productRail";
import { mountRoomAnchor } from "./roomAnchor";
import { mountOpeningVideo, openingVideoQuery } from "./openingVideo";
import { preloadScenes } from "./preloadScenes";
import { mountReadingAnchors } from "./readingNavigation";
import { mountHomePosition } from "./homePosition";
gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Native scrolling drives the current opening at every desktop aspect ratio. */
export default function HomeMotion({ children }: { children: ReactNode }) {
  const cms = useContentAdapter();
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    window.dispatchEvent(new Event("lumiq:home-enter"));
  }, []);
  useGSAP(
    () => {
      const fontsChanged = () => ScrollTrigger.refresh();
      document.fonts.addEventListener("loadingdone", fontsChanged);
      const releasePosition = root.current ? mountHomePosition(root.current) : () => {};
      const releaseImages = root.current ? preloadScenes(root.current) : () => {};
      const releaseOpening = root.current
        ? mountOpeningVideo(root.current, cms.slot("asset_a4b2063e90484449").url, [cms.slot("asset_76a5de3f207ca5bb").url,cms.slot("asset_d11e4e878cf13138").url], cms.preview)
        : () => {};
      // Opening layout is reserved before the horizontal product floor is measured.
      const releaseProducts = root.current
        ? mountProductRail(root.current)
        : () => {};
      const releaseRoom = root.current ? mountRoomAnchor(root.current) : () => {};
      const releaseReading = root.current ? mountReadingAnchors(root.current) : () => {};
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop:
            `${homeMotionQuery} and (min-height: 640px)`,
          video: openingVideoQuery,
        },
        (context) => {
          if (!context.conditions?.desktop) return;
          gsap.fromTo(
            ".lh-room-canvas",
            { y: 28 },
            {
              y: -20,
              ease: "none",
              scrollTrigger: {
                trigger: ".lh-experiences",
                start: "top bottom",
                end: "bottom top",
                scrub: 0.9,
              },
            },
          );
          // ScrollWords owns whole-text entry at every viewport size. Avoid a
          // second ancestor transform consuming the entrance before it is visible.
          let alive = true;
          document.fonts.ready.then(() => {
            if (alive) ScrollTrigger.refresh();
          });
          return () => {
            alive = false;
          };
        },
      );
      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const cleanups: (() => void)[] = [];
          root.current
            ?.querySelectorAll<HTMLElement>(".lh-product")
            .forEach((card) => {
              const art = card.querySelector(".lh-product-float");
              const rx = gsap.quickTo(art, "rotationX", {
                duration: 0.55,
                ease: "power3.out",
              });
              const ry = gsap.quickTo(art, "rotationY", {
                duration: 0.55,
                ease: "power3.out",
              });
              let bounds: DOMRect | null = null;
              const enter = () => {
                bounds = card.getBoundingClientRect();
              };
              const move = (event: PointerEvent) => {
                if (!bounds) return;
                rx((0.5 - (event.clientY - bounds.top) / bounds.height) * 9);
                ry(((event.clientX - bounds.left) / bounds.width - 0.5) * 12);
              };
              const leave = () => {
                bounds = null;
                rx(0);
                ry(0);
              };
              card.addEventListener("pointerenter", enter);
              card.addEventListener("pointermove", move);
              card.addEventListener("pointerleave", leave);
              window.addEventListener("scroll", leave, { passive: true });
              cleanups.push(() => {
                card.removeEventListener("pointerenter", enter);
                card.removeEventListener("pointermove", move);
                card.removeEventListener("pointerleave", leave);
                window.removeEventListener("scroll", leave);
              });
            });
          return () => cleanups.forEach((cleanup) => cleanup());
        },
      );
      return () => {
        releasePosition();
        document.fonts.removeEventListener("loadingdone", fontsChanged);
        releaseImages();
        releaseReading();
        mm.revert();
        releaseRoom();
        releaseProducts();
        releaseOpening();
      };
    },
    { scope: root, dependencies: [cms], revertOnUpdate: true },
  );
  return (
    <main ref={root} id="main-content" className="lh-home" data-home-state="open" tabIndex={-1}>
      {children}
    </main>
  );
}
