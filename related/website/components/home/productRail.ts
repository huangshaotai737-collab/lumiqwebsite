import {homeWideQuery} from "./responsiveLayout";
import { mountHorizontalCarousel } from "./readingNavigation";

/** Five real product links, presented as a circular glass carousel on desktop. */
export function mountProductRail(root: HTMLElement) {
  const section = root.querySelector<HTMLElement>(".lh-products");
  const viewport = section?.querySelector<HTMLElement>(".lh-products-viewport");
  const track = section?.querySelector<HTMLElement>(".lh-products-track");
  if (!section || !viewport || !track) return () => {};
  const slots = [...track.querySelectorAll<HTMLElement>(".lh-product-slot")];
  if (!slots.length) return () => {};
  const previous = section.querySelector<HTMLButtonElement>("[data-products-previous]")!;
  const next = section.querySelector<HTMLButtonElement>("[data-products-next]")!;
  const meter = section.querySelector<HTMLElement>(".lh-products-progress span")!;
  const pageNumber = section.querySelector<HTMLElement>("[data-products-current]");
  const desktop = matchMedia(homeWideQuery);
  const phone = matchMedia('(max-width: 767px)');
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const options = { signal: events.signal };
  let active = 0;
  let lockedUntil = 0;
  let positioning = false;
  let resizeFrame = 0;
  let settleFrame = 0;
  let scrollFrame = 0;
  let phonePositions: number[] = [];
  let renderedPhoneActive = -1;
  let renderedDesktop = desktop.matches;
  const measurePhonePositions = () => {
    const width = viewport.clientWidth;
    phonePositions = slots.map(slot => slot.offsetLeft - (width - slot.offsetWidth) / 2);
  };
  const centeredLeft = (slot: HTMLElement) => phone.matches && phonePositions.length
    ? phonePositions[slots.indexOf(slot)]
    : slot.offsetLeft - (viewport.clientWidth - slot.offsetWidth) / 2;
  const render = () => {
    // Native phone scrolling can dispatch many events without changing the card.
    // Preserve desktop rendering, but avoid rewriting every card on those frames.
    if (phone.matches && renderedPhoneActive === active && renderedDesktop === desktop.matches) return;
    renderedPhoneActive = phone.matches ? active : -1;
    renderedDesktop = desktop.matches;
    section.dataset.carousel = String(desktop.matches);
    section.dataset.activeProduct = String(active);
    slots.forEach((slot, i) => {
      let offset = (i - active + slots.length) % slots.length;
      if (offset > slots.length / 2) offset -= slots.length;
      slot.dataset.offset = String(offset);
      slot.dataset.active = String(i === active);
      // The WebGL fallback now displays all five products, including both outer
      // cards. Keep every visible card reachable by pointer and keyboard.
      slot.inert = false;
    });
    meter.style.transform = `scaleX(${(active + 1) / slots.length})`;
    if (pageNumber) pageNumber.textContent = String(active + 1).padStart(2, '0');
    previous.disabled = next.disabled = false;
  };
  const select = (index: number) => {
    active = (index + slots.length) % slots.length;
    lockedUntil = performance.now() + (reduced.matches ? 0 : 650);
    render();
    if (!desktop.matches) viewport.scrollTo({ left: centeredLeft(slots[active]), behavior: phone.matches || reduced.matches ? "instant" : "smooth" });
  };
  slots.forEach((slot, index) => {
    slot.addEventListener("click", (event) => {
      if (desktop.matches && index !== active) { event.preventDefault(); select(index); }
    }, options);
  });
  section.addEventListener("lumiq:product-select", (event) => {
    const index = (event as CustomEvent<number>).detail;
    if (Number.isInteger(index) && index >= 0 && index < slots.length && index !== active && performance.now() >= lockedUntil) select(index);
  }, options);
  previous.addEventListener("click", () => select(active - 1), options);
  next.addEventListener("click", () => select(active + 1), options);
  viewport.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    select(active + (event.key === "ArrowRight" ? 1 : -1));
    slots[active].querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
  }, options);
  viewport.addEventListener("scroll", () => {
    if (desktop.matches || positioning) return;
    if (phone.matches) {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        if (positioning || !phone.matches) return;
        const left = viewport.scrollLeft;
        const nearest = phonePositions.reduce((best, position, index) => Math.abs(position - left) < Math.abs(phonePositions[best] - left) ? index : best, 0);
        if (nearest !== active) { active = nearest; render(); }
      });
      return;
    }
    active = slots.reduce((best, slot, i) => Math.abs(centeredLeft(slot) - viewport.scrollLeft) < Math.abs(centeredLeft(slots[best]) - viewport.scrollLeft) ? i : best, 0);
    render();
  }, { ...options, passive: true });
  const resize = () => {
    // A layout switch changes the presentation, not the selected product.
    positioning = true;
    render();
    cancelAnimationFrame(resizeFrame);
    cancelAnimationFrame(settleFrame);
    resizeFrame = requestAnimationFrame(() => {
      if (phone.matches) measurePhonePositions();
      viewport.scrollTo({left: desktop.matches ? 0 : centeredLeft(slots[active]), behavior: 'instant'});
      settleFrame = requestAnimationFrame(() => { positioning = false; });
    });
  };
  desktop.addEventListener("change", resize, options);
  let viewportWidth = viewport.clientWidth;
  const sizeObserver = new ResizeObserver(() => {
    if (viewport.clientWidth !== viewportWidth) { viewportWidth = viewport.clientWidth; resize(); }
  });
  sizeObserver.observe(viewport);
  let releaseWheel = () => {};
  const configureWheel = () => {
    releaseWheel();
    releaseWheel = phone.matches ? () => {} : mountHorizontalCarousel(
      section.querySelector<HTMLElement>(".lh-products-stage") || section,
      (step) => select(active + step),
      () => performance.now() < lockedUntil,
    );
  };
  phone.addEventListener('change', () => { configureWheel(); resize(); }, options);
  configureWheel();
  if (phone.matches) measurePhonePositions();
  section.dataset.enhanced = "true";
  render();
  return () => {
    sizeObserver.disconnect();
    cancelAnimationFrame(resizeFrame);
    cancelAnimationFrame(settleFrame);
    cancelAnimationFrame(scrollFrame);
    releaseWheel(); events.abort();
    delete section.dataset.enhanced; delete section.dataset.carousel; delete section.dataset.activeProduct;
    slots.forEach(slot => { slot.inert = false; delete slot.dataset.offset; delete slot.dataset.active; });
  };
}
