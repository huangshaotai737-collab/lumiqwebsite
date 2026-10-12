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
  const desktop = matchMedia("(min-width: 1101px)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const events = new AbortController();
  const options = { signal: events.signal };
  let active = 0;
  let lockedUntil = 0;
  const centeredLeft = (slot: HTMLElement) => slot.offsetLeft - (viewport.clientWidth - slot.offsetWidth) / 2;
  const render = () => {
    section.dataset.carousel = String(desktop.matches);
    section.dataset.activeProduct = String(active);
    slots.forEach((slot, i) => {
      let offset = (i - active + slots.length) % slots.length;
      if (offset > slots.length / 2) offset -= slots.length;
      slot.dataset.offset = String(offset);
      slot.dataset.active = String(i === active);
      slot.inert = desktop.matches && Math.abs(offset) > 1;
    });
    meter.style.transform = `scaleX(${(active + 1) / slots.length})`;
    previous.disabled = next.disabled = false;
  };
  const select = (index: number) => {
    active = (index + slots.length) % slots.length;
    lockedUntil = performance.now() + (reduced.matches ? 0 : 650);
    render();
    if (!desktop.matches) viewport.scrollTo({ left: centeredLeft(slots[active]), behavior: reduced.matches ? "instant" : "smooth" });
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
    if (desktop.matches) return;
    active = slots.reduce((best, slot, i) => Math.abs(centeredLeft(slot) - viewport.scrollLeft) < Math.abs(centeredLeft(slots[best]) - viewport.scrollLeft) ? i : best, 0);
    render();
  }, { ...options, passive: true });
  const resize = () => { viewport.scrollLeft = 0; active = 0; render(); };
  desktop.addEventListener("change", resize, options);
  const releaseWheel = mountHorizontalCarousel(
    section.querySelector<HTMLElement>(".lh-products-stage") || section,
    (step) => select(active + step),
    () => performance.now() < lockedUntil,
  );
  section.dataset.enhanced = "true";
  render();
  return () => {
    releaseWheel(); events.abort();
    delete section.dataset.enhanced; delete section.dataset.carousel; delete section.dataset.activeProduct;
    slots.forEach(slot => { slot.inert = false; delete slot.dataset.offset; delete slot.dataset.active; });
  };
}
