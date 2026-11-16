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
