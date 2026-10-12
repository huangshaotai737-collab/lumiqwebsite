/** Two deliberate downward gestures advance cards, then native scrolling resumes. */
export function mountCarouselWheelGate(target: HTMLElement, advance: () => void, busy: () => boolean) {
  let lastWheel = -Infinity;
  let lastGesture = -Infinity;
  let lastDelta = 0;
  let requested = 0;
  let pendingExit = 0;
  let pumpTimer: ReturnType<typeof setTimeout> | undefined;
  let lastDownInput = -Infinity;
  let advances = 0;
  let released = false;
  let locked = false;
  let settling = false;
  let holdY = 0;
  const landingTop = target.matches(".lh-products-stage") ? 0 : 86;
  let previousTop = target.getBoundingClientRect().top - landingTop;
  const hold = () => {
    holdY = scrollY + target.getBoundingClientRect().top - landingTop;
    locked = true;
    target.dataset.wheelLocked = "true";
    settling = holdY - scrollY > 2;
    window.scrollTo({ top: holdY, behavior: settling ? "smooth" : "instant" });
  };
  const unlock = () => {
    locked = false;
    settling = false;
    delete target.dataset.wheelLocked;
  };
  const pump = () => {
    clearTimeout(pumpTimer);
    if (released || !locked) return;
    if (settling || busy()) {
      pumpTimer = setTimeout(pump, 30);
      return;
    }
    if (advances < Math.min(requested, 2)) {
      advance();
      advances += 1;
      pumpTimer = setTimeout(pump, 30);
    } else if (requested >= 3) {
      released = true;
      unlock();
      window.scrollBy({ top: pendingExit, behavior: "smooth" });
    }
  };
  const resetOnExit = () => {
    const bounds = target.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= innerHeight) {
      advances = 0;
      released = false;
      lastWheel = lastGesture = -Infinity;
      requested = advances = pendingExit = 0;
      clearTimeout(pumpTimer);
      unlock();
    }
    if (locked && !settling && scrollY < holdY - 2) { clearTimeout(pumpTimer); requested = advances; unlock(); }
    if (settling && Math.abs(scrollY - holdY) <= 1) {
      settling = false;
      lastWheel = performance.now();
    }
    const top = bounds.top - landingTop;
    // Native wheel momentum can finish after the wheel callback. Latch the landing,
    // rather than losing the gate when that final movement overshoots by a few pixels.
    if (performance.now() - lastDownInput < 250 && !released && !locked && previousTop > 2 && top <= 2 && top > -innerHeight * .5) hold();
    if (locked && !released && scrollY > holdY + 1) window.scrollTo({ top: holdY, behavior: "instant" });
    previousTop = top;
  };
  const wheel = (event: WheelEvent) => {
    if (event.defaultPrevented) return;
    if (event.deltaY < 0) { clearTimeout(pumpTimer); requested = advances; unlock(); return; }
    if (released || event.ctrlKey || event.deltaY <= 0 || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    if (settling) { event.preventDefault(); return; }
    lastDownInput = performance.now();
    const bounds = target.getBoundingClientRect();
    // Stop the entering gesture exactly at the full composition, never pull the page back.
    const remaining = bounds.top - landingTop;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (!locked && remaining > 2) {
      // A large wheel pulse must reach the first carousel, not skip to the next one.
      const earlier = [...document.querySelectorAll<HTMLElement>(".lh-products-stage, .lh-films-stage, .lh-family-anchor")].some(other => {
        if (other === target) return false;
        const distance = other.getBoundingClientRect().top - (other.matches(".lh-products-stage") ? 0 : 86);
        return distance > 2 && distance < remaining;
      });
      if (earlier) return;
    }
    if (!locked && (remaining < -120 || remaining > delta + 2)) return;
    if (!locked && Math.abs(remaining) > 2) {
      event.preventDefault();
      hold();
      lastWheel = performance.now();
      return;
    }
    if (!locked) hold();
    const now = performance.now();
    // A short gesture gap accepts ordinary mouse notches. Equal, strong wheel
    // pulses also count separately; a decaying trackpad tail stays one gesture.
    const decayingTail = delta < lastDelta * .6 && now - lastWheel < 300;
    const gesture = (!decayingTail && now - lastWheel > 140) ||
      (delta >= 80 && Math.abs(delta - lastDelta) < 1 && now - lastGesture >= 80);
    lastWheel = now;
    lastDelta = delta;
    event.preventDefault();
    if (gesture) {
      lastGesture = now;
      requested = Math.min(3, requested + 1);
      if (requested === 3) pendingExit = Math.max(80, delta);
      pump();
    }
  };
  window.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("scroll", resetOnExit, { passive: true });
  return () => {
    clearTimeout(pumpTimer);
    unlock();
    window.removeEventListener("wheel", wheel);
    window.removeEventListener("scroll", resetOnExit);
  };
}
