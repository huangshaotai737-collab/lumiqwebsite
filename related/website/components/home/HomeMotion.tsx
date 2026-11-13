"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {homeMotionQuery} from "./responsiveLayout";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {HomeMediaContext, type HomeMedia} from "./HomeMediaContext";
import {prepareHome} from "./prepareHome";
import {homeImageSources, homeLowSource, resolveFlowVideo, legacyBackgroundVideo} from "./homeMediaSources";
import {useStagedArtwork} from "./useStagedArtwork";
import HomeLoading from "./HomeLoading";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mountProductRail } from "./productRail";
import { mountRoomAnchor } from "./roomAnchor";
import { mountOpeningVideo, openingVideoQuery } from "./openingVideo";
import { mountHomePosition } from "./homePosition";
import HomePageWarmup from "./HomePageWarmup";
gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Native scrolling drives the current opening at every desktop aspect ratio. */
export default function HomeMotion({ children }: { children: ReactNode }) {
  const cms = useContentAdapter();
  const motionDependency = [cms.slot('asset_a4b2063e90484449').url,cms.slot('asset_76a5de3f207ca5bb').url,cms.slot('asset_d11e4e878cf13138').url].join('|');
  const root = useRef<HTMLElement>(null);
  const [media, setMedia] = useState<HomeMedia>({prepared: false, movies: {}});
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const startPoster = useStagedArtwork(cms.slot("asset_76a5de3f207ca5bb").url, media.prepared);
  const endPoster = useStagedArtwork(cms.slot("asset_d11e4e878cf13138").url, media.prepared);
  const desktopBackground = useStagedArtwork("/assets/site-backgrounds-20261108/pearl-flow-desktop.webp", media.prepared);
  const compactBackground = useStagedArtwork("/assets/site-backgrounds-20261108/pearl-flow-compact.webp", media.prepared);
  const mobileBackground = useStagedArtwork("/assets/site-backgrounds-20261108/pearl-flow-mobile.webp", media.prepared);
  // The entry gate runs once; live edits load new sources without hiding the page.
  const [assets] = useState(() => ({
    images: homeImageSources.map(source => homeLowSource(cms.url(source))),
    videos: [cms.slot("asset_a4b2063e90484449").url, resolveFlowVideo(cms.url(legacyBackgroundVideo))],
    artwork: homeImageSources.filter(source => /films-20260908|character-20261012|site-backgrounds-20261108/.test(source)).map(source => cms.url(source)),
  }));
  useEffect(() => {
    const controller = new AbortController();
    const movies: Record<string, string> = {};
    let alive = true;
    let deadline: ReturnType<typeof setTimeout>;
    const watch = () => {
      clearTimeout(deadline);
      deadline = setTimeout(() => controller.abort(new Error("Loading made no progress")), 60000);
    };
    watch();
    const extraArtwork = assets.artwork.map(source => {
      const image = new Image();
      image.fetchPriority = "low";
      image.src = source;
      void image.decode().catch(() => {});
      return image;
    });
    setError(false);
    setPercent(0);
    setMedia({prepared: false, movies: {}});
    window.dispatchEvent(new Event("lumiq:retry-images"));
    void prepareHome(assets, controller.signal, value => {
      watch();
      if (alive) setPercent(value);
    }, (source, url) => { movies[source] = url; }).then(() => {
      clearTimeout(deadline);
      if (alive) setMedia({prepared: true, movies});
    }).catch(() => {
      controller.abort();
      clearTimeout(deadline);
      if (alive) setError(true);
    });
    return () => {
      alive = false;
      controller.abort();
      clearTimeout(deadline);
      extraArtwork.forEach(image => {image.src = "";});
      Object.values(movies).forEach(url => URL.revokeObjectURL(url));
    };
  }, [assets, attempt]);
  useEffect(() => {
    const main = root.current;
    if (!main) return;
    const previous = main.inert;
    main.inert = !media.prepared;
    return () => {main.inert = previous;};
  }, [media.prepared]);
  useEffect(() => {
    if (!media.prepared) return;
    window.dispatchEvent(new Event("lumiq:home-enter"));
    ScrollTrigger.refresh();
  }, [media.prepared]);
  useGSAP(
    () => {
      if (!media.prepared) return;
      const fontsChanged = () => {
        if (matchMedia(homeMotionQuery).matches) ScrollTrigger.refresh();
      };
      document.fonts.addEventListener("loadingdone", fontsChanged);
      const releasePosition = root.current ? mountHomePosition(root.current) : () => {};
      const releaseOpening = root.current
        ? mountOpeningVideo(root.current, media.movies[cms.slot("asset_a4b2063e90484449").url] ?? cms.slot("asset_a4b2063e90484449").url)
        : () => {};
      // Opening layout is reserved before the horizontal product floor is measured.
      const releaseProducts = root.current
        ? mountProductRail(root.current)
        : () => {};
      const releaseRoom = root.current ? mountRoomAnchor(root.current) : () => {};
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
        mm.revert();
        releaseRoom();
        releaseProducts();
        releaseOpening();
      };
    },
    { scope: root, dependencies: [motionDependency, media], revertOnUpdate: true },
  );
  return (
    <HomeMediaContext.Provider value={media}>
      <main ref={root} id="main-content" className="lh-home" style={{
        "--home-opening-start": `url(${JSON.stringify(startPoster)})`,
        "--home-opening-end": `url(${JSON.stringify(endPoster)})`,
        "--home-flow-desktop": `url(${JSON.stringify(desktopBackground)})`,
        "--home-flow-compact": `url(${JSON.stringify(compactBackground)})`,
        "--home-flow-mobile": `url(${JSON.stringify(mobileBackground)})`,
      } as CSSProperties} data-home-state={media.prepared ? "open" : "loading"} aria-busy={!media.prepared} tabIndex={-1}>
        {media.prepared && <HomePageWarmup />}
        {children}
      </main>
      <HomeLoading percent={percent} error={error} prepared={media.prepared} retry={() => setAttempt(value => value + 1)} />
    </HomeMediaContext.Provider>
  );
}
