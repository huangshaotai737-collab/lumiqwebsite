"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { usePathname } from "next/navigation";

export const backgroundVideoSource = "/assets/home-background-flow-20261007/flow-30s-scrub.mp4";

export const chapterImage = (name: string) => `/assets/chapter-backgrounds-20260910/${name}.webp`;

/** One shared viewport background, with chapter cues on home and native page progress elsewhere. */
export default function HomeBackgrounds() {
  const pathname = usePathname();
  const [host, setHost] = useState<Element | null>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setHost(document.querySelector(".lumiq-root > .bg-layer"));
  }, []);
  useLayoutEffect(() => {
    if (!host) return;
    // A persistent cached movie may still hold the previous route's dark frame.
    // Hide it before the new document paints; route setup decodes its own frame.
    video.current!.style.opacity = "0";
    video.current!.dataset.ready = "false";
    fallback.current!.style.opacity = "1";
    const root = host.closest<HTMLElement>(".lumiq-root")!;
    root.dataset.flowBackground = "false";
    root.dataset.siteFlowTone = "light";
  }, [host, pathname]);
  useEffect(() => {
    if (!host) return;
    let frame = 0;
    let loaded = video.current!.readyState >= 2;
    let displayed = false;
    let decodedTone = "light";
    let start = 0;
    let end = 1;
    let cues: [number, number][] = [];
    const movie = video.current!;
    const root = host.closest<HTMLElement>(".lumiq-root");
    let home = root?.querySelector<HTMLElement>(".lh-home");
    const lastFrame = () => Math.max(0, movie.duration - 1 / 24);
    const motion = matchMedia("(min-width: 1101px) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      frame = 0;
      // A cached source need not emit loadeddata again after a route changes
      // during seeking; recover readiness from the actual media state.
      if (movie.readyState >= 2) loaded = true;
      // Wait until the handoff is approaching, including direct navigation to a
      // later chapter. Do not compete with the opening film on the first visit.
      if (motion.matches && !document.hidden && scrollY >= start - innerHeight * .75 && !movie.getAttribute("src")) {
        movie.src = backgroundVideoSource;
        movie.load();
      }
      let desired = 0;
      if (loaded && Number.isFinite(movie.duration)) {
        const progress = Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start)));
        desired = progress * lastFrame();
        if (cues.length) {
          const right = cues.findIndex(([position]) => position > scrollY);
          if (right === 0) desired = 0;
          else if (right < 0) desired = 30;
          else {
            const [a, from] = cues[right - 1], [b, to] = cues[right];
            desired = from + (to - from) * (scrollY - a) / Math.max(1, b - a);
          }
        }
        desired = Math.min(lastFrame(), Math.round(desired * 24) / 24);
        // On a fast skip the first decoded frame is still the pearl opening.
        // Reveal only after the requested chapter frame is decoded; thereafter
        // keep it visible while seeks temporarily lower readyState.
        if (!movie.seeking && movie.readyState >= 2 && Math.abs(movie.currentTime - desired) <= 1 / 48) {
          displayed = true;
          decodedTone = movie.currentTime >= 20 ? "dark" : "light";
        }
      }
      const ready = motion.matches && !movie.error && displayed;
      movie.dataset.ready = String(ready);
      movie.style.opacity = ready ? "1" : "0";
      if (root) {
        // The homepage palette is chapter-specific; inner pages adapt exposed
        // copy to the actual decoded frame, never to an unfulfilled seek.
        const flow = String(ready && Boolean(home));
        const tone = ready ? decodedTone : "light";
        if (root.dataset.flowBackground !== flow) root.dataset.flowBackground = flow;
        if (root.dataset.siteFlowTone !== tone) root.dataset.siteFlowTone = tone;
      }
      if (fallback.current) fallback.current.style.opacity = ready ? "0" : "1";
      if (!motion.matches || !loaded || document.hidden || movie.seeking || movie.readyState < 2) return;
      if (Math.abs(movie.currentTime - desired) > 1 / 48) movie.currentTime = desired;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      const top = (selector: string) => scrollY + (document.querySelector(selector)?.getBoundingClientRect().top ?? 0);
      home = root?.querySelector<HTMLElement>(".lh-home");
      start = home ? ScrollTrigger.getById("home-opening-video")?.end ?? top("#products") - innerHeight : 0;
      end = document.documentElement.scrollHeight - innerHeight;
      const nav = document.querySelector('.site-nav')?.getBoundingClientRect().height ?? 0;
      cues = home ? [[start, 0]] : [];
      const add = (position: number, time: number) => cues.push([Math.max(cues[cues.length - 1][0], Math.min(end, position)), time]);
      const chapter = (id: string, selector: string, time: number, settled = 0) => {
        const trigger = ScrollTrigger.getById(id);
        add(trigger ? trigger.start + (trigger.end - trigger.start) * settled : top(selector) - nav, time);
        if (trigger) add(trigger.end, time);
      };
      if (home) {
        chapter("home-products-hold", "#products", 0);
        chapter("home-films-hold", "#films", 6);
        chapter("home-room-anchor", "#experiences", 12);
        // These timelines reveal the complete reading layout after their initial shrink.
        chapter("home-trust-anchor", "#safety", 18, .88 / 1.4);
        chapter("home-family-chapters", "#family", 24, .36 / 1.2);
        chapter("home-join-anchor", "#join", 30);
        add(end, 30);
      }
      movie.dataset.scrollStart = String(start);
      movie.dataset.scrollEnd = String(end);
      movie.dataset.scrollCues = JSON.stringify(cues);
      movie.parentElement!.style.top = "0px";
      schedule();
    };
    const onLoaded = () => { loaded = true; schedule(); };
    const configure = () => {
      movie.pause();
      if (!motion.matches) { loaded = displayed = false; decodedTone = "light"; movie.removeAttribute("src"); movie.load(); }
      schedule();
    };
    const resize = new ResizeObserver(measure);
    if (home) resize.observe(home);
    resize.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    window.addEventListener("lumiq:home-enter", schedule);
    document.addEventListener("visibilitychange", schedule);
    movie.addEventListener("loadeddata", onLoaded);
    movie.addEventListener("canplay", schedule);
    movie.addEventListener("seeked", schedule);
    movie.addEventListener("error", schedule);
    motion.addEventListener("change", configure);
    ScrollTrigger.addEventListener("refresh", measure);
    configure();
    measure();
    update();
    return () => {
      cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", measure); window.removeEventListener("lumiq:home-enter", schedule);
      movie.removeEventListener("loadeddata", onLoaded); movie.removeEventListener("canplay", schedule); movie.removeEventListener("seeked", schedule); movie.removeEventListener("error", schedule);
      motion.removeEventListener("change", configure); ScrollTrigger.removeEventListener("refresh", measure);
      document.removeEventListener("visibilitychange", schedule);
      // Keep the one media element/cache across client navigation. The next
      // route seeks its own opening frame before becoming visible again.
      movie.pause();
      if (root) { delete root.dataset.flowBackground; delete root.dataset.siteFlowTone; }
    };
  }, [host, pathname]);
  useEffect(() => {
    if (!host) return;
    const movie = video.current!;
    return () => { movie.pause(); movie.removeAttribute("src"); movie.load(); };
  }, [host]);
  return host ? createPortal(<div className="lh-fixed-backgrounds" aria-hidden="true">
    <video ref={video} data-background-video muted playsInline preload="auto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0 }} />
    <div data-background-fallback ref={fallback} style={{ backgroundImage: "url('/assets/home-background-flow-20261007/pearl-first.webp')" }} />
  </div>, host) : null;
}
