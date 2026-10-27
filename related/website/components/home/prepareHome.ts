import { openingVideoQuery } from "./openingVideo";

export const loadingLogo = "/assets/brand/lumiq-logo-transparent-dark.png";

export type HomeAssets = {
  opening: string;
  images: string[];
  videos: string[];
};

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
    };
    const failed = () => { clean(); reject(new Error(`Image failed: ${image.currentSrc || image.src}`)); };
    const loaded = () => {
      // HomeImage starts with an inline preview. Wait for its real source.
      if (!image.currentSrc || image.currentSrc.startsWith("data:")) return;
      void image.decode().then(() => {
        if (!image.naturalWidth) { failed(); return; }
        clean(); resolve();
      }, failed);
    };
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed);
    if (image.complete && image.naturalWidth) loaded();
  }), signal);
}

async function fetchVideo(source: string, signal: AbortSignal, progress: (value: number) => void, retain: boolean) {
  const response = await fetch(source, { signal, cache: "force-cache" });
  if (!response.ok) throw new Error(`Video failed: ${source}`);
  const total = Number(response.headers.get("content-length"));
  const reader = response.body?.getReader();
  if (!reader) {
    const blob = await response.blob();
    if (!blob.size) throw new Error(`Video is empty: ${source}`);
    progress(1);
    return retain ? blob : undefined;
  }
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (retain) chunks.push(new Uint8Array(value));
    if (total > 0) progress(Math.min(.99, received / total));
  }
  if (!received) throw new Error(`Video is empty: ${source}`);
  progress(1);
  return retain ? new Blob(chunks, { type: response.headers.get("content-type") ?? "video/mp4" }) : undefined;
}

/** The homepage stays covered until every current homepage image and film has loaded. */
export async function prepareHome(
  root: HTMLElement,
  assets: HomeAssets,
  signal: AbortSignal,
  onProgress: (percent: number) => void,
  ownVideo: (url: string) => void,
) {
  root.querySelectorAll<HTMLElement>("[data-home-section]").forEach(section => {
    section.dataset.homeMediaRequested = "true";
    section.querySelectorAll<HTMLImageElement>("img[data-home-image]").forEach(image => {
      image.dispatchEvent(new Event("lumiq:load-image"));
    });
  });
  const images = Array.from(root.querySelectorAll<HTMLImageElement>("img[data-home-image]"));
  const imageSources = [...new Set([loadingLogo, ...assets.images])];
  const tasks: { weight: number; run: (progress: (value: number) => void) => Promise<unknown> }[] = [
    ...images.map(image => ({ weight: 1, run: () => decodeImage(image, signal) })),
    ...imageSources.map(src => ({ weight: 1, run: () => {
      const image = new window.Image();
      image.src = src;
      return decodeImage(image, signal);
    } })),
    { weight: 1, run: () => abortable(Promise.all([
      document.fonts.load('400 16px "Lumiq Manrope"'),
      document.fonts.load('600 24px "Lumiq Manrope"'),
    ]), signal) },
    ...[assets.opening, ...assets.videos].map(source => ({ weight: 5, run: async (progress: (value: number) => void) => {
      const blob = await fetchVideo(source, signal, progress, source === assets.opening);
      if (source !== assets.opening) return;
      const url = URL.createObjectURL(blob!);
      ownVideo(url);
      const video = root.querySelector<HTMLVideoElement>(".lh-opening-video")!;
      video.dataset.preparedSrc = url;
      if (!window.matchMedia(openingVideoQuery).matches) return;
      video.src = url;
      video.preload = "auto";
      video.load();
      await abortable(new Promise<void>((resolve, reject) => {
        const loaded = () => { clean(); resolve(); };
        const failed = () => { clean(); reject(new Error("Opening video could not be decoded")); };
        const clean = () => { video.removeEventListener("loadeddata", loaded); video.removeEventListener("error", failed); };
        video.addEventListener("loadeddata", loaded);
        video.addEventListener("error", failed);
        if (video.readyState >= 2) loaded();
      }), signal);
      root.querySelector<HTMLElement>(".lh-video-layer")!.dataset.ready = "true";
    } })),
  ];
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
  const failed = results.find(result => result.status === "rejected");
  if (failed?.status === "rejected") throw failed.reason;
  onProgress(100);
}
