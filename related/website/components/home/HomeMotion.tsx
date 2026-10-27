"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {homeMotionQuery} from "./responsiveLayout";
import {useVisualPreview} from '@/components/content/SiteContentProvider';

import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountProductRail } from "./productRail";
import { mountRoomAnchor } from "./roomAnchor";
import { mountOpeningVideo, openingVideoQuery } from "./openingVideo";
import { preloadScenes } from "./preloadScenes";
import { mountReadingAnchors } from "./readingNavigation";
import { mountHomePosition } from "./homePosition";
import HomeLoading from "./HomeLoading";
import { backgroundVideoSource, chapterImage } from "./HomeBackgrounds";
import type { HomeAssets } from "./prepareHome";
gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Native scrolling drives the current opening at every desktop aspect ratio. */
export default function HomeMotion({ children }: { children: ReactNode }) {
  const cms = useContentAdapter();
  const visual = useVisualPreview();
  const motionDependency = visual ? [cms.slot('asset_a4b2063e90484449').url,cms.slot('asset_76a5de3f207ca5bb').url,cms.slot('asset_d11e4e878cf13138').url].join('|') : cms;
  const root = useRef<HTMLElement>(null);
  const [prepared, setPrepared] = useState(false);
  const assets = useMemo<HomeAssets>(() => ({
    opening: cms.slot("asset_a4b2063e90484449").url,
    images: [
      cms.slot("asset_76a5de3f207ca5bb").url,
      cms.slot("asset_d11e4e878cf13138").url,
      cms.url(chapterImage("products")),
      cms.url("/assets/home-interactive/pearl-light.webp"),
      cms.url("/assets/home-anchored-2026-09-07/join-crystal.webp"),
      cms.url("/assets/home-rooms-20260907/room-full-4k.webp"),
      cms.url("/assets/home-safety-20261002/story-world-family.jpg"),
      cms.url("/assets/character-20261012/poster-clean.png"),
      cms.url("/assets/character-20261012/settled-clean.png"),
      ...["everyday-companion", "worlds-together", "welcome-home"]
        .map(film => cms.url(`/assets/films-20260908/${film}.jpg`)),
    ],
    videos: [
      cms.url(backgroundVideoSource),
      ...["everyday-companion", "worlds-together", "welcome-home"]
        .map(film => cms.url(`/assets/films-20260908/${film}.mp4`)),
      cms.url("/assets/character-20261012/ola-girl-clean-alpha.webm"),
      cms.url("/assets/character-20261012/ola-girl-clean-alpha-safari.mov"),
    ],
  }), [cms]);
  const onPrepared = useCallback(() => {
    setPrepared(true);
    if (root.current) root.current.dataset.homeState = "open";
  }, []);
  const onOpened = useCallback(() => {
    window.dispatchEvent(new Event("lumiq:home-enter"));
    ScrollTrigger.refresh();
  }, []);
  useGSAP(
    () => {
      if (!prepared) return;
      const fontsChanged = () => ScrollTrigger.refresh();
      document.fonts.addEventListener("loadingdone", fontsChanged);
      const releasePosition = root.current ? mountHomePosition(root.current) : () => {};
      const releaseImages = root.current ? preloadScenes(root.current) : () => {};
      const releaseOpening = root.current
        ? mountOpeningVideo(root.current)
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
          // Refresh layout measurements after fonts settle; reading copy stays
          // in its final position during every scroll frame.
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
    { scope: root, dependencies: [motionDependency, prepared], revertOnUpdate: true },
  );
  return (
    <>
      <main ref={root} id="main-content" className="lh-home" data-home-state="loading" tabIndex={-1}>
        {children}
      </main>
      <HomeLoading root={root} assets={assets} onPrepared={onPrepared} onOpened={onOpened} />
    </>
  );
}
