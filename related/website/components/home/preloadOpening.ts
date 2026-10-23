/** Fully download only the opening film, and decode its two fallback images.
 * A preload hint/canplay event alone cannot guarantee later scroll seeks. */
export async function preloadOpening(source: string, signal: AbortSignal, posterSources?: string[], preview = false) {
  const posters = (posterSources ?? [
    "/assets/home-video/ola-scroll-v16-start-20260909.webp",
    "/assets/home-video/ola-scroll-v16-end-20260909.webp",
  ]).map(async src => {
    const image = new Image();
    image.src = src;
    await image.decode();
    signal.throwIfAborted();
  });
  const download = async () => {
    const response = await fetch(source, {signal, cache: preview ? "no-store" : "force-cache"});
    if (!response.ok) throw new Error("Opening film download failed");
    // blob() resolves only after the entire response body, including every chunk.
    const blob = await response.blob();
    if (!blob.size) throw new Error("Opening film was empty");
    return blob;
  };
  const [blob] = await Promise.all([download(), ...posters]);
  signal.throwIfAborted();
  return blob;
}
