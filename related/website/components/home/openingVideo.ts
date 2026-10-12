import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Same approved film, short-GOP H.264 for bounded scroll-seek decoding on WebKit.
export const openingVideoSource = "/assets/home-video/compat-20261008/ola-scroll-v16-scrub.mp4";
export const openingVideoQuery =
  "(min-width: 1101px) and (prefers-reduced-motion: no-preference)";

/** One continuous shot, held at its approved first frame until the user scrolls. */
export function mountOpeningVideo(root: HTMLElement) {
  const opening = root.querySelector<HTMLElement>(".lh-opening")!;
  const stage = opening.querySelector<HTMLElement>(".lh-opening-stage")!;
  const video = opening.querySelector<HTMLVideoElement>(".lh-opening-video")!;
  const layer = opening.querySelector<HTMLElement>(".lh-video-layer")!;
  const heroCopy = opening.querySelector<HTMLElement>(".lh-hero-copy")!;
  const brandCopy = opening.querySelector<HTMLElement>(".lh-ola-copy")!;
  const cards = opening.querySelector<HTMLElement>(".lh-rhythm-cards")!;
  // Keep the film's reading progress outside the responsive GSAP context: any
  // matchMedia change (including another section's height breakpoint) can
  // revert pins and temporarily reset scroll before this context is rebuilt.
  const mediaEvents = gsap as typeof gsap & {
    addEventListener(event: "matchMediaInit", listener: () => void): void;
    removeEventListener(event: "matchMediaInit", listener: () => void): void;
  };
  const scrollState = ScrollTrigger as typeof ScrollTrigger & { isRefreshing?: boolean };
  const anchor = 0.92;
  let initialAnchor = window.location.hash === "#ola";
  let currentScroll: ScrollTrigger | undefined;
  let reading: number | null = initialAnchor ? anchor : window.scrollY <= 1 ? 0 : null;
  let restoring: number | null = null;
  let alive = true;
  let resizeFrame = 0;
  let settleTimer = 0;
  const capture = () => {
    if (!alive || restoring !== null || scrollState.isRefreshing) return;
    if (currentScroll) {
      reading = scrollY >= currentScroll.start - 1 && scrollY <= currentScroll.end + 1
        ? currentScroll.progress : null;
    } else {
      const bounds = stage.getBoundingClientRect();
      const top = scrollY + bounds.top;
      const distance = Math.max(1, bounds.height - innerHeight);
      reading = scrollY >= top - 1 && scrollY <= top + distance + 1
        ? Math.max(0, Math.min(1, (scrollY - top) / distance)) : null;
    }
  };
  // Only a real responsive layout transaction acquires a snapshot. A later
  // font/section refresh may restore an existing one, never reacquire after input.
  const beginLayout = () => {
    restoring ??= reading;
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      restoring = null;
      capture();
    }, 300);
  };
  const restore = () => {
    if (restoring === null) return;
    const bounds = stage.getBoundingClientRect();
    const top = currentScroll?.start ?? scrollY + bounds.top;
    const distance = currentScroll
      ? currentScroll.end - currentScroll.start : Math.max(0, bounds.height - innerHeight);
    window.scrollTo({ top: top + distance * restoring, behavior: "instant" });
    ScrollTrigger.update();
  };
  const resize = () => {
    beginLayout();
    // A pinned element otherwise retains its old measured width for GSAP's
    // 200ms resize debounce, shifting the plane's center during a window drag.
    if (!resizeFrame) resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      if (alive) { ScrollTrigger.refresh(); restore(); }
    });
  };
  const input = () => {
    clearTimeout(settleTimer);
    restoring = null;
    capture();
  };
  const key = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Enter"].includes(event.key)) input();
  };
  mediaEvents.addEventListener("matchMediaInit", resize);
  ScrollTrigger.addEventListener("refresh", restore);
  window.addEventListener("resize", resize);
  window.addEventListener("scroll", capture, { passive: true });
  window.addEventListener("wheel", input, { passive: true });
  window.addEventListener("touchstart", input, { passive: true });
  window.addEventListener("pointerdown", input, { passive: true });
  window.addEventListener("click", input);
  window.addEventListener("keydown", key);
  const mm = gsap.matchMedia();
  mm.add({desktop: "(min-width: 1101px)", motion: "(prefers-reduced-motion: no-preference)"}, context => {
    if (!context.conditions?.desktop) return;
    opening.dataset.videoMode = "true";
    if (!context.conditions.motion) {
      opening.dataset.staticOpening = "true";
      return () => { delete opening.dataset.videoMode; delete opening.dataset.staticOpening; };
    }
    layer.dataset.intro = "complete";
    let mounted = true;
    let frame = 0;
    const playhead = { progress: 0 };
    const duration = () => Number.isFinite(video.duration) ? video.duration : 6;
    const endTime = () => Math.max(0, duration() - 1 / 30);
    const tick = () => {
      frame = 0;
      if (!mounted || document.hidden || video.error || video.readyState < 2 || video.seeking) return;
      const bounds = stage.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > innerHeight) return;
      const desired = Math.min(endTime(), Math.round(playhead.progress * endTime() * 24) / 24);
      if (Math.abs(video.currentTime - desired) > 1 / 48) {
        video.currentTime = desired;
        return;
      }
      layer.dataset.ready = "true";
    };
    const schedule = () => { if (mounted && !frame) frame = requestAnimationFrame(tick); };
    const update = () => {
      heroCopy.inert = playhead.progress > 0.4;
      brandCopy.inert = cards.inert = playhead.progress < 0.43;
      video.dataset.scrollProgress = String(playhead.progress);
      layer.style.setProperty("--opening-progress", String(playhead.progress));
      capture();
      schedule();
    };
    const ready = () => { video.pause(); schedule(); };
    const failed = () => { video.pause(); delete layer.dataset.ready; };
    const visibility = () => {
      if (document.hidden) video.pause();
      else schedule();
    };
    video.muted = true;
    video.loop = false;
    video.preload = "auto";
    video.addEventListener("loadeddata", ready);
    video.addEventListener("seeked", schedule);
    video.addEventListener("canplay", schedule);
    video.addEventListener("error", failed);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("lumiq:home-enter", ready);
    const source = video.dataset.preparedSrc || openingVideoSource;
    if (video.getAttribute("src") !== source) { video.src = source; video.load(); }
    const timeline = gsap.timeline({ scrollTrigger: {
      id: "home-opening-video", trigger: stage, pin: stage, start: "top top",
      end: () => `+=${window.innerHeight * 2.85}`, scrub: true,
      invalidateOnRefresh: true, refreshPriority: 2, onRefresh: update,
    } });
    timeline
      .to(playhead, { progress: 1, duration: anchor, ease: "none", onUpdate: update }, 0)
      .to({}, { duration: 1 - anchor }, anchor)
      .to(heroCopy, { autoAlpha: 0, y: -35, duration: 0.25, ease: "none" }, 0.05)
      // Text shares the video's scroll timeline in both directions.
      .fromTo(brandCopy, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: "none" }, 0.42)
      .fromTo(cards, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.22, ease: "none" }, 0.48);
    const scroll = timeline.scrollTrigger!;
    currentScroll = scroll;
    const resetFrame = requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (initialAnchor) {
        reading = restoring = anchor;
        initialAnchor = false;
      }
      restore();
      scroll.update();
      update();
      ready();
    });
    update();
    return () => {
      mounted = false;
      currentScroll = undefined;
      cancelAnimationFrame(resetFrame);
      cancelAnimationFrame(frame);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("seeked", schedule);
      video.removeEventListener("canplay", schedule);
      video.removeEventListener("error", failed);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("lumiq:home-enter", ready);
      video.pause(); video.removeAttribute("src"); video.load();
      delete video.dataset.scrollProgress;
      delete opening.dataset.videoMode;
      delete layer.dataset.ready;
      delete layer.dataset.intro;
      layer.style.removeProperty("--opening-progress");
      heroCopy.inert = brandCopy.inert = cards.inert = false;
    };
  });
  return () => {
    alive = false;
    cancelAnimationFrame(resizeFrame);
    clearTimeout(settleTimer);
    mediaEvents.removeEventListener("matchMediaInit", resize);
    ScrollTrigger.removeEventListener("refresh", restore);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", capture);
    window.removeEventListener("wheel", input);
    window.removeEventListener("touchstart", input);
    window.removeEventListener("pointerdown", input);
    window.removeEventListener("click", input);
    window.removeEventListener("keydown", key);
    mm.revert();
  };
}
