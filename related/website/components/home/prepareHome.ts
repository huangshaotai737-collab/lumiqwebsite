import { openingVideoQuery, openingVideoSource } from "./openingVideo";

export const loadingLogo = "/assets/brand/lumiq-logo-transparent-dark.png";

function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason ?? new Error("Loading cancelled"));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener("abort", abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

async function decodeImage(image: HTMLImageElement, signal: AbortSignal) {
  image.loading = "eager";
  await abortable(new Promise<void>((resolve, reject) => {
    const clean = () => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      signal.removeEventListener("abort", clean);
    };
    const failed = () => { clean(); reject(new Error("A full-resolution image could not be loaded")); };
    const loaded = () => {
      // On retry React may still be replacing its preview src. Wait for the
      // actual new load event instead of decoding that old request prematurely.
      if (!image.currentSrc || image.currentSrc.startsWith("data:")) return;
      void image.decode().then(() => {
        if (!image.naturalWidth || image.currentSrc.startsWith("data:")) { failed(); return; }
        clean(); resolve();
      }, failed);
    };
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed, { once: true });
    signal.addEventListener("abort", clean, { once: true });
    if (image.complete && image.naturalWidth) loaded();
  }), signal);
}

async function downloadVideo(signal: AbortSignal, progress: (value: number) => void) {
  const response = await fetch(openingVideoSource, { signal });
  if (!response.ok) throw new Error("The opening film could not be loaded");
  const total = Number(response.headers.get("content-length"));
  const reader = response.body?.getReader();
  if (!reader) return response.blob();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(new Uint8Array(value));
    received += value.byteLength;
    if (total > 0) progress(Math.min(0.98, received / total * 0.98));
  }
  return new Blob(chunks, { type: "video/mp4" });
}

/** Resolves only after full images are decoded and the complete video is local. */
export async function prepareHome(
  root: HTMLElement,
  signal: AbortSignal,
  onProgress: (percent: number) => void,
  ownVideo: (url: string) => void,
) {
  const useVideo = window.matchMedia(openingVideoQuery).matches;
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img[data-home-image]"))
    .filter(image => image.getClientRects().length > 0)
    .filter(image => !useVideo || !image.closest(".lh-glass-word, .lh-hero-stage, .lh-brand-character"));
  const extraSources = [loadingLogo, ...(useVideo ? [
    "/assets/home-video/ola-scroll-v16-start-20260909.webp",
    "/assets/home-video/ola-scroll-v16-end-20260909.webp",
  ] : [])];
  const tasks: { weight: number; run: (progress: (value: number) => void) => Promise<unknown> }[] = [
    ...images.map(image => ({ weight: 1, run: () => decodeImage(image, signal) })),
    ...extraSources.map(src => ({ weight: 1, run: () => {
      const image = new window.Image(); image.src = src;
      return decodeImage(image, signal);
    } })),
    { weight: 1, run: () => abortable(document.fonts.load('600 24px "Lumiq Manrope"'), signal) },
  ];
  if (useVideo) tasks.push({ weight: 35, run: async (progress) => {
    const blob = await downloadVideo(signal, progress);
    if (signal.aborted) throw signal.reason;
    const url = URL.createObjectURL(blob);
    ownVideo(url);
    const video = root.querySelector<HTMLVideoElement>(".lh-opening-video")!;
    video.dataset.preparedSrc = url;
    video.src = url;
    video.preload = "auto";
    video.load();
    await abortable(new Promise<void>((resolve, reject) => {
      const clean = () => {
        video.removeEventListener("loadeddata", loaded);
        video.removeEventListener("error", failed);
        signal.removeEventListener("abort", clean);
      };
      const loaded = () => { clean(); resolve(); };
      const failed = () => { clean(); reject(new Error("The opening film could not be decoded")); };
      video.addEventListener("loadeddata", loaded, { once: true });
      video.addEventListener("error", failed, { once: true });
      signal.addEventListener("abort", clean, { once: true });
      if (video.readyState >= 2) loaded();
    }), signal);
    // Put the decoded movie beneath the opaque loader before it starts fading.
    // Otherwise the fallback artwork is exposed first, then jumps to frame zero.
    root.querySelector<HTMLElement>(".lh-video-layer")!.dataset.ready = "true";
  } });
  const values = tasks.map(() => 0);
  const total = tasks.reduce((sum, task) => sum + task.weight, 0);
  const report = (index: number, value: number) => {
    values[index] = Math.max(values[index], value);
    onProgress(Math.min(99, tasks.reduce((sum, task, i) => sum + task.weight * values[i], 0) / total * 100));
  };
  const results = await Promise.allSettled(tasks.map(async (task, index) => {
    await task.run(value => report(index, value));
    report(index, 1);
  }));
  const failed = results.filter(result => result.status === "rejected");
  // A new clone may not have received its Git LFS media yet. Development should
  // remain navigable with the component-level preview fallbacks; production keeps
  // the existing strict loading gate so missing release assets are still visible.
  if (failed.length && process.env.NODE_ENV !== "development") throw failed[0].reason;
  onProgress(100);
}
