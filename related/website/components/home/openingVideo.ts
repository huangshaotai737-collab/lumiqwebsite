import {homeWideQuery} from "./responsiveLayout";
import {gsap} from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";

// Same approved film, short-GOP H.264 for bounded seeking on WebKit.
export const openingVideoSource = "/assets/home-video/compat-20261008/ola-scroll-v16-scrub.mp4";

/** Two real document anchors. A desktop wheel gesture completes one transition. */
export function mountOpeningVideo(root: HTMLElement, source = openingVideoSource, posters?: string[]) {
  const opening = root.querySelector<HTMLElement>(".lh-opening")!;
  const hero = opening.querySelector<HTMLElement>("#top")!;
  const companion = opening.querySelector<HTMLElement>("#ola")!;
  const video = opening.querySelector<HTMLVideoElement>(".lh-opening-video")!;
  const layer = opening.querySelector<HTMLElement>(".lh-video-layer")!;
  const posterLayers = [...layer.querySelectorAll<HTMLElement>(".lh-video-start-poster, .lh-video-end-poster")];
  const previousPosters = posterLayers.map(element => element.style.backgroundImage);
  posterLayers.forEach((element, index) => {
    if (posters?.[index]) element.style.backgroundImage = `url(${JSON.stringify(posters[index])})`;
  });
  const mm = gsap.matchMedia();
  let initialLayout = true;
  mm.add({desktop: homeWideQuery, motion: "(prefers-reduced-motion: no-preference)"}, context => {
    const initial = initialLayout;
    initialLayout = false;
    if (!context.conditions?.desktop) return;
    const motion = Boolean(context.conditions.motion);
    opening.dataset.openingAnchors = "true";
    opening.dataset.videoMode = "true";
    if (!motion) opening.dataset.staticOpening = "true";
    const chapters = [hero, companion];
    const top = (index: number) => scrollY + chapters[index].getBoundingClientRect().top;
    let tween: gsap.core.Tween | undefined;
    let lastWheel = -Infinity;
    let consumed = false;
    let settled: number | null = null;
    let frame = 0;
    let videoFrame = 0;
    let presentedTime = -1;
    let failed = false;
    let mounted = true;
    let progress = 0;
    const endTime = () => Number.isFinite(video.duration) ? Math.max(0, video.duration - 1 / 30) : 0;
    const desiredTime = () => Math.min(endTime(), Math.round(progress * endTime() * 24) / 24);
    const stop = () => { tween?.kill(); tween = undefined; };
    const go = (index: number, animate: boolean) => {
      stop();
      settled = index;
      if (!animate || !motion) {
        window.scrollTo({top: top(index), behavior: "instant"});
        schedule();
        return;
      }
      const position = {y: scrollY};
      tween = gsap.to(position, {
        y: top(index), duration: 1, ease: "none",
        onUpdate: () => window.scrollTo({top: position.y, behavior: "instant"}),
        onComplete: () => { tween = undefined; settled = index; schedule(); },
      });
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.defaultPrevented || !event.deltaY || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      if (event.target instanceof Element && event.target.closest('.site-nav, [role="dialog"], input, textarea, select, [contenteditable="true"]')) return;
      const first = top(0), second = top(1);
      const returning = event.deltaY < 0 && scrollY > second + 2 && scrollY < second + innerHeight;
      if (scrollY < first - 2 || scrollY > second + 2 && !returning) return;
      if (event.timeStamp - lastWheel > 280) consumed = false;
      lastWheel = event.timeStamp;
      // A trackpad's tail can continue after the animation. Keep the same
      // gesture on its destination; a fresh downward gesture leaves screen two.
      if (consumed || tween) { event.preventDefault(); return; }
      const direction = Math.sign(event.deltaY);
      if (direction > 0 && scrollY >= second - 2 || direction < 0 && scrollY <= first + 2) return;
      event.preventDefault();
      consumed = true;
      go(returning || direction > 0 ? 1 : 0, true);
    };
    const key = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="dialog"]')) return;
      const down = ["ArrowDown", "PageDown", " "].includes(event.key) && !event.shiftKey;
      const up = ["ArrowUp", "PageUp", "Home"].includes(event.key) || event.key === " " && event.shiftKey;
      if (!down && !up) { if (event.key === 'End') stop(); return; }
      if (scrollY < top(0) - 2 || scrollY > top(1) + 2) return;
      if (down && scrollY >= top(1) - 2 || up && scrollY <= top(0) + 2) return;
      event.preventDefault();
      consumed = false;
      go(down ? 1 : 0, false);
    };
    const navigate = () => {
      const index = location.hash === '#ola' ? 1 : location.hash === '#top' ? 0 : null;
      stop(); consumed = false;
      if (index !== null) go(index, false);
    };
    const pointer = () => { stop(); consumed = false; };
    const resize = () => {
      const index = settled;
      stop();
      if (index !== null) go(index, false);
      schedule();
    };
    const render = () => {
      frame = 0;
      if (!mounted) return;
      const first = top(0), second = top(1);
      progress = Math.max(0, Math.min(1, (scrollY - first) / Math.max(1, second - first)));
      if (!tween) settled = Math.abs(scrollY - first) < 2 ? 0 : Math.abs(scrollY - second) < 2 ? 1 : null;
      layer.dataset.poster = progress >= .5 ? 'end' : 'start';
      if (!motion || failed || document.hidden) return;
      video.dataset.scrollProgress = String(progress);
      if (video.readyState < 1 || video.seeking) return;
      const wanted = desiredTime();
      if (Math.abs(video.currentTime - wanted) > 1 / 48) { video.currentTime = wanted; return; }
      if (video.readyState >= 2 && (!video.requestVideoFrameCallback || Math.abs(presentedTime - wanted) < .1)) layer.dataset.ready = 'true';
    };
    const schedule = () => { if (mounted && !frame) frame = requestAnimationFrame(render); };
    const watchFrame = () => {
      if (!video.requestVideoFrameCallback) return;
      videoFrame = video.requestVideoFrameCallback((_time, metadata) => {
        presentedTime = metadata.mediaTime;
        schedule();
        if (mounted && !failed) watchFrame();
      });
    };
    const ready = () => { video.pause(); schedule(); };
    const error = () => {
      failed = true;
      delete layer.dataset.ready;
      video.pause();
      // Keep both anchors and readable content when media decoding is unavailable.
    };
    const visibility = () => { video.pause(); if (!document.hidden) schedule(); };
    window.addEventListener('wheel', wheel, {passive: false});
    window.addEventListener('keydown', key);
    window.addEventListener('hashchange', navigate);
    window.addEventListener('popstate', navigate);
    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', pointer, {passive: true});
    window.addEventListener('scroll', schedule, {passive: true});
    if (motion) {
      layer.dataset.intro = 'complete';
      video.muted = true;
      video.loop = false;
      video.preload = 'auto';
      for (const name of ['loadedmetadata', 'loadeddata', 'seeked', 'canplay']) video.addEventListener(name, ready);
      video.addEventListener('error', error);
      document.addEventListener('visibilitychange', visibility);
      watchFrame();
      video.src = source;
      video.load();
    }
    // Layout now reserves exactly two viewports; there is no GSAP pin or scrub.
    if (initial) navigate();
    schedule();
    ScrollTrigger.refresh();
    return () => {
      mounted = false;
      stop();
      cancelAnimationFrame(frame);
      if (videoFrame) video.cancelVideoFrameCallback(videoFrame);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', key);
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('popstate', navigate);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', pointer);
      window.removeEventListener('scroll', schedule);
      for (const name of ['loadedmetadata', 'loadeddata', 'seeked', 'canplay']) video.removeEventListener(name, ready);
      video.removeEventListener('error', error);
      document.removeEventListener('visibilitychange', visibility);
      video.pause(); video.removeAttribute('src'); video.load();
      delete video.dataset.scrollProgress;
      delete opening.dataset.videoMode;
      delete opening.dataset.staticOpening;
      delete opening.dataset.openingAnchors;
      delete layer.dataset.ready;
      delete layer.dataset.intro;
      delete layer.dataset.poster;
    };
  });
  return () => {
    mm.revert();
    posterLayers.forEach((element, index) => {element.style.backgroundImage = previousPosters[index];});
  };
}
