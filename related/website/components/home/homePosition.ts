import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

type ReadingPosition = { element: HTMLElement; top: number };

// GSAP exposes these lifecycle APIs at runtime but omits them from its bundled types.
const mediaEvents = gsap as typeof gsap & {
  addEventListener(event: "matchMediaInit", listener: () => void): void;
  removeEventListener(event: "matchMediaInit", listener: () => void): void;
};
const scrollState = ScrollTrigger as typeof ScrollTrigger & { isRefreshing?: boolean };

/** Preserve the reading location across pin teardown/rebuild, not its old pixel offset. */
export function mountHomePosition(root: HTMLElement) {
  const sections = [...root.querySelectorAll<HTMLElement>("[data-home-section]")];
  const navTop = () => document.querySelector(".site-nav")?.getBoundingClientRect().height ?? 86;
  const hashTarget = () => {
    const id = location.hash.slice(1);
    if (!id) return null;
    const target = document.getElementById(id);
    return target && root.contains(target) && target !== root && !target.closest(".lh-opening") ? target : null;
  };
  const hasOpeningAnchor = () => {
    const id = location.hash.slice(1);
    if (!id) return false;
    const element = document.getElementById(id);
    return Boolean(element && root.contains(element) && element.closest(".lh-opening"));
  };
  let target = hashTarget();
  let openingAnchor = hasOpeningAnchor();
  let reading: ReadingPosition | null = null;
  let restoring: ReadingPosition | null = null;
  let changingLayout = false;
  let aligned = false;
  let alive = true;
  let frame = 0;
  let captureFrame = 0;
  let layoutTimer = 0;
  let inputTimer = 0;

  const capture = () => {
    if (inputTimer || changingLayout || restoring || scrollState.isRefreshing) return;
    // Native #ola positioning can expose a later chapter before the opening's
    // pin exists. Its own controller resolves that anchor to a film frame;
    // a snapshot of the temporary chapter must not override that position.
    if (openingAnchor) { reading = null; return; }
    const landing = navTop();
    let visible: HTMLElement | null = null;
    let visibleHeight = 0;
    for (const section of sections) {
      const bounds = section.getBoundingClientRect();
      const height = Math.min(bounds.bottom, innerHeight) - Math.max(bounds.top, landing);
      if (height > visibleHeight) { visible = section; visibleHeight = height; }
    }
    // A sliver of the previous opening chapter must not hide a mostly visible
    // product section. Rank viewport coverage before delegating opening layout.
    reading = visible && !visible.closest(".lh-opening")
      ? { element: visible, top: visible.getBoundingClientRect().top }
      : null;
  };
  const settle = () => {
    frame = 0;
    const position = target ? { element: target, top: navTop() } : restoring;
    if (position?.element.isConnected) {
      const delta = position.element.getBoundingClientRect().top - position.top;
      if (Math.abs(delta) > 1) window.scrollTo({ top: scrollY + delta, behavior: "instant" });
      ScrollTrigger.update();
      aligned = true;
    }
    changingLayout = false;
    capture();
  };
  const schedule = () => { if (alive && !frame) frame = requestAnimationFrame(settle); };
  const resize = () => {
    if (inputTimer) { releaseLayout(); return; }
    restoring ??= reading;
    changingLayout = true;
    clearTimeout(layoutTimer);
    // ScrollTrigger batches resize refreshes for 200ms. Keep the original
    // section through that batch and any font refresh, not just the first RAF.
    layoutTimer = window.setTimeout(() => {
      layoutTimer = 0;
      restoring = null;
      changingLayout = false;
      capture();
    }, 300);
    schedule();
  };
  const refresh = () => { if (target || restoring) schedule(); };
  const releaseLayout = () => {
    clearTimeout(layoutTimer);
    layoutTimer = 0;
    restoring = null;
    changingLayout = false;
  };
  const navigate = () => {
    clearTimeout(inputTimer); inputTimer = 0;
    releaseLayout(); target = hashTarget(); openingAnchor = hasOpeningAnchor(); aligned = false; schedule();
  };
  const waitForInput = () => {
    clearTimeout(inputTimer);
    inputTimer = window.setTimeout(() => { inputTimer = 0; capture(); }, 300);
  };
  const input = () => {
    target = null; openingAnchor = false; reading = null; releaseLayout(); waitForInput();
  };
  const key = (event: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) input();
  };
  const scroll = () => {
    // A refresh arriving after End/wheel must not reacquire the pre-gesture
    // snapshot. Resume capture only when the user's scrolling has settled.
    if (inputTimer) { waitForInput(); return; }
    if (changingLayout || scrollState.isRefreshing || frame || captureFrame) return;
    captureFrame = requestAnimationFrame(() => {
      captureFrame = 0;
      if (target && aligned) {
        const drift = Math.abs(target.getBoundingClientRect().top - navTop());
        // WebKit may restore its previous scroll offset after pageshow. Real
        // gestures already release the target; correct only a small late drift.
        if (drift > 200) target = null;
        else if (drift > 1) schedule();
      }
      capture();
    });
  };

  // matchMedia can reset scroll before the DOM reports the resize. Use the
  // last settled section snapshot, and restore only after the new pins exist.
  mediaEvents.addEventListener("matchMediaInit", resize);
  ScrollTrigger.addEventListener("refreshInit", resize);
  ScrollTrigger.addEventListener("refresh", refresh);
  window.addEventListener("resize", resize);
  window.addEventListener("hashchange", navigate);
  window.addEventListener("popstate", navigate);
  window.addEventListener("pageshow", navigate);
  window.addEventListener("scroll", scroll, { passive: true });
  window.addEventListener("wheel", input, { passive: true });
  window.addEventListener("touchstart", input, { passive: true });
  window.addEventListener("pointerdown", input, { passive: true });
  window.addEventListener("keydown", key);
  document.fonts.ready.then(schedule);
  // The browser/Next router may already have restored a scroll offset here,
  // but HomeMotion has not created the opening's pin yet. Capturing this
  // temporary layout would pick a later chapter and pull the reader down when
  // the initial refresh adds the pin. The first scheduled settle captures only
  // after the synchronous motion setup has finished; real resizes still use
  // the last settled snapshot above.
  schedule();

  return () => {
    alive = false;
    cancelAnimationFrame(frame);
    cancelAnimationFrame(captureFrame);
    clearTimeout(layoutTimer);
    clearTimeout(inputTimer);
    mediaEvents.removeEventListener("matchMediaInit", resize);
    ScrollTrigger.removeEventListener("refreshInit", resize);
    ScrollTrigger.removeEventListener("refresh", refresh);
    window.removeEventListener("resize", resize);
    window.removeEventListener("hashchange", navigate);
    window.removeEventListener("popstate", navigate);
    window.removeEventListener("pageshow", navigate);
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("wheel", input);
    window.removeEventListener("touchstart", input);
    window.removeEventListener("pointerdown", input);
    window.removeEventListener("keydown", key);
  };
}
