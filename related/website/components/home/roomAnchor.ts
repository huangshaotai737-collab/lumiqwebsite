import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function mountRoomAnchor(root: HTMLElement) {
  const room = root.querySelector<HTMLElement>(".lh-room-layout");
  const section = room?.closest<HTMLElement>(".lh-room-section");
  if (!room || !section) return () => {};
  const mm = gsap.matchMedia();
  mm.add("(min-width: 1101px) and (min-height: 720px) and (pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
    const navHeight = () => document.querySelector('.site-nav')?.getBoundingClientRect().height ?? 86;
    const measure = () => {
      const top = navHeight();
      room.style.setProperty('--room-height', `${innerHeight - top}px`);
      room.style.setProperty('--room-top', `${top}px`);
      section.style.setProperty('--room-stage-height', `${innerHeight - top + innerHeight * .3}px`);
    };
    room.dataset.reading = 'true';
    section.dataset.roomSticky = 'true';
    measure();
    ScrollTrigger.addEventListener('refreshInit', measure);
    // Native sticky stays constrained by the section in both scroll directions.
    // It avoids the fixed/transform hand-off that can leave a stale Safari layer.
    window.addEventListener('resize', measure);
    return () => {
      ScrollTrigger.removeEventListener('refreshInit', measure);
      window.removeEventListener('resize', measure);
      delete room.dataset.reading;
      delete section.dataset.roomSticky;
      room.style.removeProperty('--room-height');
      room.style.removeProperty('--room-top');
      section.style.removeProperty('--room-stage-height');
    };
  });
  return () => mm.revert();
}
