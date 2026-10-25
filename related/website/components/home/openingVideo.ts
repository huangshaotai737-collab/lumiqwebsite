import {homeMotionQuery, homeWideQuery} from "./responsiveLayout";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Same approved film, short-GOP H.264 for bounded scroll-seek decoding on WebKit.
export const openingVideoSource = "/assets/home-video/compat-20261008/ola-scroll-v16-scrub.mp4";
export const openingVideoQuery =
  homeMotionQuery;

/** One continuous shot, held at its approved first frame until the user scrolls. */
export function mountOpeningVideo(root: HTMLElement, source = openingVideoSource, posters?: string[]) {
  const opening = root.querySelector<HTMLElement>(".lh-opening")!;
  const stage = opening.querySelector<HTMLElement>(".lh-opening-stage")!;
  const video = opening.querySelector<HTMLVideoElement>(".lh-opening-video")!;
  const layer = opening.querySelector<HTMLElement>(".lh-video-layer")!;
  const posterLayers = Array.from(layer.querySelectorAll<HTMLElement>(".lh-video-start-poster, .lh-video-end-poster"));
  const previousPosters = posterLayers.map(element => element.style.backgroundImage);
  // Preserve CMS-selected artwork without making its download a loading gate.
  posterLayers.forEach((element, index) => {
    if (posters?.[index]) element.style.backgroundImage = `url(${JSON.stringify(posters[index])})`;
  });
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
  type ChapterPosition = {element: HTMLElement; top: number};
  let chapterReading: ChapterPosition | null = null;
  let restoringChapter: ChapterPosition | null = null;
  let alive = true;
  let failedThisVisit = false;
  let resizeFrame = 0;
  let settleTimer = 0;
  const capture = () => {
    if (!alive || restoring !== null || restoringChapter || scrollState.isRefreshing) return;
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
    chapterReading = null;
    if (reading === null) {
      const navBottom = document.querySelector('.site-nav')?.getBoundingClientRect().bottom ?? 0;
      let largest = 0;
      root.querySelectorAll<HTMLElement>('[data-home-section]').forEach(element => {
        if (opening.contains(element)) return;
        const bounds = element.getBoundingClientRect();
        const visible = Math.max(0, Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, navBottom));
        if (visible > largest) { largest = visible; chapterReading = {element, top: bounds.top}; }
      });
    }
  };
  // Only a real responsive layout transaction acquires a snapshot. A later
  // font/section refresh may restore an existing one, never reacquire after input.
  const beginLayout = () => {
    restoring ??= reading;
    if (restoring === null) restoringChapter ??= chapterReading;
    clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      restoring = null;
      restoringChapter = null;
      capture();
    }, 300);
  };
  const restore = () => {
    if (restoringChapter) {
      // A pin disappearing above the current chapter must not change what the
      // reader is looking at. Restore its viewport offset after each refresh.
      const {element, top} = restoringChapter;
      window.scrollTo({top: scrollY + element.getBoundingClientRect().top - top, behavior: 'instant'});
      ScrollTrigger.update();
      return;
    }
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
    restoringChapter = null;
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
  mm.add({desktop: homeWideQuery, motion: "(prefers-reduced-motion: no-preference)"}, context => {
    if (!context.conditions?.desktop) return;
    opening.dataset.videoMode = "true";
    if (!context.conditions.motion || failedThisVisit) {
      opening.dataset.staticOpening = "true";
      return () => { delete opening.dataset.videoMode; delete opening.dataset.staticOpening; };
    }
    layer.dataset.intro = "complete";
    let mounted = true;
    let failed = false;
    let frame = 0;
    let decodedFrame = 0;
    let stallTimer = 0;
    let presentedTime: number | null = null;
    let sourceRequested = false;
    const playhead = {progress: 0};
    const duration = () => Number.isFinite(video.duration) ? video.duration : 6;
    const endTime = () => Math.max(0, duration() - 1 / 30);
    const desiredTime = () => Math.min(endTime(), Math.round(playhead.progress * endTime() * 24) / 24);
    // Media enhances a page that is already usable. While it buffers, the
    // approved posters and copy follow scrolling without a document-wide gate.
    const copyTimeline = gsap.timeline({paused: true})
      .to(heroCopy, {autoAlpha: 0, y: -35, duration: .25, ease: "none"}, .05)
      .fromTo(brandCopy, {autoAlpha: 0, y: 24}, {autoAlpha: 1, y: 0, duration: .22, ease: "none"}, .42)
      .fromTo(cards, {autoAlpha: 0, y: 24}, {autoAlpha: 1, y: 0, duration: .22, ease: "none"}, .48);
    const renderCopy = () => {
      const actual = layer.dataset.ready && presentedTime !== null
        ? Math.max(0, Math.min(1, presentedTime / endTime())) : playhead.progress;
      copyTimeline.time(actual * anchor);
      heroCopy.inert = actual > .4;
      brandCopy.inert = cards.inert = actual < .43;
      layer.dataset.poster = actual >= .4 ? "end" : "start";
    };
    const clearStall = () => { clearTimeout(stallTimer); stallTimer = 0; };
    const fallback = () => {
      if (!mounted || failed) return;
      failed = failedThisVisit = true;
      clearStall();
      const inOpening = stage.getBoundingClientRect().bottom > 0 && stage.getBoundingClientRect().top <= innerHeight;
      const chapter = playhead.progress >= .4 ? brandCopy.closest<HTMLElement>("section")! : heroCopy.closest<HTMLElement>("section")!;
      const nextChapter = chapterReading;
      timeline.scrollTrigger?.kill(true);
      timeline.kill();
      copyTimeline.kill();
      currentScroll = undefined;
      reading = restoring = null;
      restoringChapter = null;
      gsap.set([heroCopy, brandCopy, cards], {clearProps: "opacity,visibility,transform"});
      opening.dataset.staticOpening = "true";
      delete layer.dataset.ready;
      heroCopy.inert = brandCopy.inert = cards.inert = false;
      video.pause(); video.removeAttribute("src"); video.load();
      ScrollTrigger.refresh();
      if (inOpening) window.scrollTo({top: chapter.offsetTop, behavior: "instant"});
      else if (nextChapter) window.scrollBy({top: nextChapter.element.getBoundingClientRect().top - nextChapter.top, behavior: "instant"});
      capture();
    };
    const aligned = () => !video.error && video.readyState >= 2 && !video.seeking &&
      Math.abs(video.currentTime - desiredTime()) <= 1 / 48 &&
      (presentedTime !== null && Math.abs(presentedTime - desiredTime()) <= 1 / 12);
    const waitForDecoder = () => {
      if (layer.dataset.ready && !stallTimer) stallTimer = window.setTimeout(() => {
        stallTimer = 0;
        const wanted = desiredTime();
        const buffered = Array.from({length: video.buffered.length}, (_, index) =>
          wanted >= video.buffered.start(index) && wanted <= video.buffered.end(index)
        ).some(Boolean);
        if (buffered) fallback();
        else {
          // A distant seek can need another network range. Keep readable copy
          // and posters while it arrives, then resume the film at this position.
          delete layer.dataset.ready;
          renderCopy();
        }
      }, 4000);
    };
    const tick = () => {
      frame = 0;
      if (!mounted || failed || document.hidden) return;
      const bounds = stage.getBoundingClientRect();
      if (bounds.bottom < 0 || bounds.top > innerHeight) { clearStall(); return; }
      if (!sourceRequested) {
        // Native media loading can decode and seek with HTTP Range requests;
        // it never waits for a complete fetch/blob copy in JavaScript memory.
        sourceRequested = true;
        video.preload = "auto";
        video.src = source;
        video.load();
      }
      if (video.readyState < 2) { waitForDecoder(); return; }
      if (video.seeking) { waitForDecoder(); return; }
      if (Math.abs(video.currentTime - desiredTime()) > 1 / 48) {
        waitForDecoder();
        video.currentTime = desiredTime();
        return;
      }
      if (aligned()) {
        clearStall();
        // Latch the movie plane. Ordinary waiting/seeking never reveals posters.
        layer.dataset.ready = "true";
        renderCopy();
      } else waitForDecoder();
    };
    const schedule = () => { if (mounted && !failed && !frame) frame = requestAnimationFrame(tick); };
    const watchFrame = () => {
      if (!video.requestVideoFrameCallback) return;
      decodedFrame = video.requestVideoFrameCallback((_now, metadata) => {
        if (!mounted || failed) return;
        if (presentedTime !== metadata.mediaTime) clearStall();
        presentedTime = metadata.mediaTime;
        renderCopy();
        schedule();
        watchFrame();
      });
    };
    watchFrame();
    const ready = () => {
      if (!mounted || failed) return;
      video.pause();
      if (!video.requestVideoFrameCallback && video.readyState >= 2 && !video.seeking) {
        presentedTime = video.currentTime;
        clearStall();
        renderCopy();
      }
      schedule();
    };
    const update = () => {
      if (failed) return;
      video.dataset.scrollProgress = String(playhead.progress);
      capture();
      if (!layer.dataset.ready) renderCopy();
      schedule();
    };
    const visibility = () => {
      if (document.hidden) { video.pause(); clearStall(); }
      else schedule();
    };
    video.muted = true;
    video.loop = false;
    video.preload = "auto";
    video.addEventListener("loadeddata", ready);
    video.addEventListener("seeked", ready);
    video.addEventListener("seeking", schedule);
    video.addEventListener("waiting", schedule);
    video.addEventListener("stalled", schedule);
    video.addEventListener("canplay", ready);
    video.addEventListener("error", fallback);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("lumiq:home-enter", ready);
    const timeline = gsap.timeline({ scrollTrigger: {
      id: "home-opening-video", trigger: stage, pin: stage, start: "top top",
      end: () => `+=${window.innerHeight * 2.85}`, scrub: true,
      invalidateOnRefresh: true, refreshPriority: 2, onRefresh: update,
    } });
    timeline.to(playhead, {progress: 1, duration: anchor, ease: "none", onUpdate: update}, 0)
      .to({}, {duration: 1 - anchor}, anchor);
    const scroll = timeline.scrollTrigger!;
    currentScroll = scroll;
    const resetFrame = requestAnimationFrame(() => {
      if (failed || !mounted) return;
      ScrollTrigger.refresh();
      if (initialAnchor) {
        reading = restoring = anchor;
        initialAnchor = false;
      }
      restore();
      scroll.update();
      update();
    });
    renderCopy();
    update();
    return () => {
      mounted = false;
      clearStall();
      currentScroll = undefined;
      cancelAnimationFrame(resetFrame);
      cancelAnimationFrame(frame);
      if (decodedFrame) video.cancelVideoFrameCallback(decodedFrame);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("seeked", ready);
      video.removeEventListener("seeking", schedule);
      video.removeEventListener("waiting", schedule);
      video.removeEventListener("stalled", schedule);
      video.removeEventListener("canplay", ready);
      video.removeEventListener("error", fallback);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("lumiq:home-enter", ready);
      video.pause(); video.removeAttribute("src"); video.load();
      delete video.dataset.scrollProgress;
      delete opening.dataset.videoMode;
      delete opening.dataset.staticOpening;
      delete layer.dataset.ready;
      delete layer.dataset.intro;
      delete layer.dataset.poster;
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
    posterLayers.forEach((element, index) => { element.style.backgroundImage = previousPosters[index]; });
  };
}
