import loadingImages from "@/lib/home-loading-image-manifest.json";

export const loadingLogo = "/assets/brand/lumiq-logo-transparent-dark.png";
export const flowVideoSource = "/assets/site-backgrounds-20261108/pearl-flow-scroll.mp4";
export const flowPoster = "/assets/site-backgrounds-20261108/pearl-flow-poster.webp";
export const legacyBackgroundVideo = "/assets/background-variants-20260911/version-5-tail-wave-20260914.mp4";
const images: Record<string, string> = loadingImages;
export const homeImageSources = Object.keys(images);

/** Never append parameters to a signed CMS URL. Local CMS media goes through
 * the same-origin optimizer; bundled artwork uses committed 480px files. */
export function homeLowSource(source: string) {
  if (source === '/assets/content/empty-image.svg' || source.startsWith('/api/content/preview-media/')) return source;
  return images[source] ?? (source.startsWith("/")
    ? `/_next/image?url=${encodeURIComponent(source)}&w=480&q=75` : source);
}

export function resolveFlowVideo(source: string) {
  return source === legacyBackgroundVideo ? flowVideoSource : source;
}
