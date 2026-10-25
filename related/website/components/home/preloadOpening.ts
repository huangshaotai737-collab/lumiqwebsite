/** Fully download only the opening film, and decode its two fallback images.
 * A preload hint/canplay event alone cannot guarantee later scroll seeks. */
export async function preloadOpening(source: string, signal: AbortSignal, posterSources?: string[], preview = false, onProgress?: () => void) {
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
    // Observe received bytes without releasing the opening gate early: blob()
    // still resolves only after the entire response body has arrived.
    const body = response.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (chunk.byteLength) onProgress?.();
        controller.enqueue(chunk);
      },
    }), {signal});
    const blob = await (body ? new Response(body, {headers: response.headers}) : response).blob();
    if (!blob.size) throw new Error("Opening film was empty");
    return blob;
  };
  const [blob] = await Promise.all([download(), ...posters]);
  signal.throwIfAborted();
  return blob;
}
