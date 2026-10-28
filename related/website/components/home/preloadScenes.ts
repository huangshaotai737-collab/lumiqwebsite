/** Current/nearby artwork takes precedence over other-page warmup. Recheck
 * after scrolling; failed images must not block future prefetches forever. */
export function hasPendingHomeArtwork() {
  return [...document.querySelectorAll<HTMLImageElement>('.lh-home img[data-home-image]')].some(image => {
    if (image.complete || image.dataset.homeImageState === 'error') return false;
    const bounds = image.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return false;
    return image.loading === 'eager' || image.fetchPriority === 'high' ||
      (bounds.bottom > -1200 && bounds.top < innerHeight + 1200 && bounds.right > 0 && bounds.left < innerWidth);
  });
}
