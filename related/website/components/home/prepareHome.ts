import {loadingLogo} from "./homeMediaSources";
export {loadingLogo};

export type HomeLoadAssets = {images: string[]; videos: string[]};

async function decodeImage(source: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const image = new Image();
  image.src = source;
  await new Promise<void>((resolve, reject) => {
    const abort = () => { image.src = ""; reject(signal.reason); };
    signal.addEventListener("abort", abort, {once: true});
    void image.decode().then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
  signal.throwIfAborted();
}

/** Gate on decoded 480 artwork and both complete movie bodies, never metadata
 * or canplay alone. Object URLs remain owned by HomeMotion until route unmount. */
export async function prepareHome(assets: HomeLoadAssets, signal: AbortSignal,
  progress: (percent: number) => void, own: (source: string, url: string) => void) {
  const images = [...new Set(assets.images)];
  const videos = [...new Set(assets.videos)];
  const weights = [...images.map(() => 1), ...videos.map(() => 20)];
  const values = weights.map(() => 0);
  const total = weights.reduce((a, b) => a + b, 0);
  const report = (index: number, value: number) => {
    values[index] = Math.max(values[index], value);
    progress(weights.reduce((sum, weight, i) => sum + weight * values[i], 0) / total * 100);
  };
  await Promise.all([
    ...images.map(async (source, index) => {await decodeImage(source, signal); report(index, 1);}),
    ...videos.map(async (source, index) => {
      const response = await fetch(source, {signal, cache: "force-cache"});
      if (!response.ok) throw new Error("Video download failed");
      const size = Number(response.headers.get("content-length"));
      let received = 0;
      const body = response.body?.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          received += chunk.byteLength;
          if (size > 0) report(images.length + index, Math.min(.99, received / size));
          controller.enqueue(chunk);
        },
      }), {signal});
      const blob = await (body ? new Response(body, {headers: response.headers}) : response).blob();
      signal.throwIfAborted();
      if (!blob.size) throw new Error("Empty video");
      own(source, URL.createObjectURL(blob));
      report(images.length + index, 1);
    }),
  ]);
  signal.throwIfAborted();
  progress(100);
}
