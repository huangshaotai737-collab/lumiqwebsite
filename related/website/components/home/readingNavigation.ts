import { CarouselInput } from "@/lib/carousel-input";

/** A trackpad gesture changes one card. Vertical input always belongs to the page. */
export function mountHorizontalCarousel(target: HTMLElement, advance: (step: number) => void, busy: () => boolean) {
  const input = new CarouselInput();
  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.defaultPrevented) return;
    const delta = event.shiftKey ? event.deltaY : event.deltaX;
    if (!delta || (!event.shiftKey && Math.abs(event.deltaX) <= Math.abs(event.deltaY))) return;
    event.preventDefault();
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerWidth : 1;
    const step = input.wheel(delta * unit, event.timeStamp, performance.now());
    if (step && !busy()) advance(step);
  };
  target.addEventListener("wheel", wheel, { passive: false });
  return () => target.removeEventListener("wheel", wheel);
}

/** Catch a wheel pulse briefly at a complete composition; never require card advances. */
export function mountReadingAnchors(root: HTMLElement) {
  const enabled = matchMedia("(min-width: 1101px) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  const targets = [...root.querySelectorAll<HTMLElement>(".lh-products-stage, .lh-films-stage, .lh-family-anchor, .lh-room-layout, .lh-safety, #join")];
  const visited = new Set<HTMLElement>();
  let held: HTMLElement | null = null;
  let began = 0;
  let lastInput = -Infinity;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const release = () => { if (held) delete held.dataset.readingAnchored; held = null; clearTimeout(timeout); };
  const wheel = (event: WheelEvent) => {
    if (!enabled.matches || event.defaultPrevented || event.ctrlKey || event.shiftKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    const now = performance.now();
    const previousInput = lastInput;
    lastInput = now;
    if (held) {
      // Fresh gestures leave immediately; decaying momentum has a bounded settling window.
      if (now - previousInput > 180 || now - began > 600) release();
      else { event.preventDefault(); clearTimeout(timeout); timeout = setTimeout(release, 180); return; }
    }
    const navBottom = document.querySelector(".site-nav")?.getBoundingClientRect().bottom ?? 74;
    const landing = navBottom + 12;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1;
    const delta = event.deltaY * unit;
    const direction = Math.sign(delta);
    const candidates = targets.filter(target => {
      const bounds = target.getBoundingClientRect();
      if (bounds.top > innerHeight || bounds.bottom < 0) visited.delete(target);
      const distance = bounds.top - landing;
      return !visited.has(target) && direction * distance > 2 && direction * distance <= Math.abs(delta) + 2;
    }).sort((a, b) => Math.abs(a.getBoundingClientRect().top - landing) - Math.abs(b.getBoundingClientRect().top - landing));
    const target = candidates[0];
    if (!target) return;
    event.preventDefault();
    visited.add(target);
    held = target;
    began = now;
    target.dataset.readingAnchored = "true";
    window.scrollTo({ top: scrollY + target.getBoundingClientRect().top - landing, behavior: "instant" });
    timeout = setTimeout(release, 180);
  };
  window.addEventListener("wheel", wheel, { passive: false });
  return () => { release(); window.removeEventListener("wheel", wheel); };
}
