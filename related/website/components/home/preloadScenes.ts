/** Pinned/transformed scenes need explicit activation: native image lazy loading
 * can begin requests before ScrollTrigger has reserved the opening's height. */
export function preloadScenes(root: HTMLElement) {
  const activate = (section: Element) => {
    (section as HTMLElement).dataset.homeMediaRequested = "true";
    section.querySelectorAll<HTMLImageElement>("img[data-home-image]").forEach(image => {
      image.loading = "eager";
      image.dispatchEvent(new Event("lumiq:load-image"));
    });
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      activate(entry.target);
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "600px 0px" });
  root.querySelectorAll("[data-home-section]").forEach(section => observer.observe(section));
  return () => observer.disconnect();
}
