import type {EventManager} from '@react-three/fiber';

type GlassIntersection = Pick<IntersectionObserverEntry, 'isIntersecting' | 'intersectionRatio'> & {
  boundingClientRect: Pick<DOMRectReadOnly, 'width' | 'height'>;
};

export function glassIsVisible(entry: GlassIntersection) {
  return entry.isIntersecting && entry.intersectionRatio >= .2 &&
    entry.boundingClientRect.width > 0 && entry.boundingClientRect.height > 0;
}

// This Canvas is decorative; product interactions are ordinary DOM controls.
// No pointer manager means an async Canvas cannot bind to an unmounted div.
export function decorativeGlassEvents(): EventManager<HTMLElement> {
  return {enabled: false, priority: 0};
}
