"use client";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {useVisualPreview} from '@/components/content/SiteContentProvider';
import {visualMediaDependency} from '@/lib/content/visual-dependency';
import {homeMotionQuery} from "./responsiveLayout";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export const backgroundVideoSource = "/assets/background-variants-20260911/version-5-tail-wave-20260914.mp4";

export const chapterImage = (name: string) => `/assets/chapter-backgrounds-20260910/${name}.webp`;

export default function HomeBackgrounds() {
  const cms = useContentAdapter();
  const visual = useVisualPreview();
  const mediaDependency = visualMediaDependency(cms,visual,backgroundVideoSource);
  const resolvedVideoSource = cms.url(backgroundVideoSource);
  const [host, setHost] = useState<Element | null>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    setHost(document.querySelector(".lumiq-root .bg-layer"));
  }, []);
  useEffect(() => {
    if (!host) return;
    let frame = 0;
    let loaded = false;
    let start = 0;
    let end = 1;
    let cues: [number, number][] = [];
    const movie = video.current!;
    const root = host.closest<HTMLElement>(".lumiq-root");
    const lastFrame = () => Math.max(0, movie.duration - 1 / 24);
    const motion = matchMedia(homeMotionQuery);
    const update = () => {
      frame = 0;
      // Load the approved light movie only as its first chapter approaches.
      if (motion.matches && !document.hidden && scrollY >= start - innerHeight * .75 && !movie.getAttribute("src")) {
        movie.src = resolvedVideoSource;
        movie.load();
      }
      // Seeking can temporarily lower readyState. Keep the last decoded frame visible.
      const ready = motion.matches && !movie.error && loaded;
      movie.dataset.ready = String(ready);
      movie.style.opacity = ready ? "1" : "0";
      const theme = String(ready);
      if (root && root.dataset.flowBackground !== theme) root.dataset.flowBackground = theme;
      if (fallback.current) fallback.current.style.opacity = ready ? "0" : "1";
      if (!ready || document.hidden || movie.seeking || movie.readyState < 2) return;
      const progress = Math.max(0, Math.min(1, (scrollY - start) / Math.max(1, end - start)));
      let desired = progress * lastFrame();
      if (cues.length) {
        const right = cues.findIndex(([position]) => position > scrollY);
        if (right === 0) desired = 0;
        else if (right < 0) desired = 30;
        else {
          const [a, from] = cues[right - 1], [b, to] = cues[right];
          desired = from + (to - from) * (scrollY - a) / Math.max(1, b - a);
        }
        desired = Math.min(desired, lastFrame());
      }
      desired = Math.min(lastFrame(), Math.round(desired * 24) / 24);
      if (Math.abs(movie.currentTime - desired) > 1 / 48) movie.currentTime = desired;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const measure = () => {
      const top = (selector: string) => scrollY + (document.querySelector(selector)?.getBoundingClientRect().top ?? 0);
      start = ScrollTrigger.getById("home-opening-video")?.end ?? top("#products") - innerHeight;
      end = document.documentElement.scrollHeight - innerHeight;
      const nav = document.querySelector('.site-nav')?.getBoundingClientRect().height ?? 0;
      cues = [[start, 0]];
      const add = (position: number, time: number) => cues.push([Math.max(cues[cues.length - 1][0], Math.min(end, position)), time]);
      const chapter = (id: string, selector: string, time: number, settled = 0) => {
        const trigger = ScrollTrigger.getById(id);
        add(trigger ? trigger.start + (trigger.end - trigger.start) * settled : top(selector) - nav, time);
        if (trigger) add(trigger.end, time);
      };
      chapter("home-products-hold", "#products", 5);
      chapter("home-films-hold", "#films", 10);
      chapter("home-room-anchor", "#experiences", 15);
      // These timelines reveal the complete reading layout after their initial shrink.
      chapter("home-family-chapters", "#family", 20, .36 / 1.2);
      chapter("home-trust-anchor", "#safety", 25, .88 / 1.4);
      chapter("home-join-anchor", "#join", 30);
      add(end, 30);
      movie.dataset.scrollStart = String(start);
      movie.dataset.scrollEnd = String(end);
      movie.dataset.scrollCues = JSON.stringify(cues);
      movie.parentElement!.style.top = "0px";
      schedule();
    };
    const onLoaded = () => { loaded = true; schedule(); };
    const configure = () => {
      movie.pause();
      if (!motion.matches) { loaded = false; movie.removeAttribute("src"); movie.load(); }
      schedule();
    };
    const resize = new ResizeObserver(measure);
    const home = document.querySelector(".lh-home");
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
      movie.pause(); movie.removeAttribute("src"); movie.load();
      if (root) delete root.dataset.flowBackground;
    };
  }, [host, mediaDependency, resolvedVideoSource]);
  return host ? createPortal(<div className="lh-fixed-backgrounds" aria-hidden="true">
    <video ref={video} data-background-video muted playsInline preload="auto" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0 }} />
    <div data-background-fallback ref={fallback} style={{ backgroundImage: `url('${cms.url(chapterImage("products"))}')` }} />
  </div>, host) : null;
}
