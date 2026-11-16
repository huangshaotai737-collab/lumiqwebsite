"use client";

import {useContentAdapter} from "@/components/content/useContentAdapter";
import {getImageProps, type ImageProps} from "next/image";
import {useEffect, useState} from "react";
import {useHomeMedia} from "./HomeMediaContext";
import {homeLowSource} from "./homeMediaSources";
import RecoverableImage from "@/components/content/RecoverableImage";
import images from "@/lib/home-image-manifest.json";
import inlinePreviews from "@/lib/home-inline-previews.json";
import responsive from "@/lib/responsive-image-manifest.json";

type Asset = {base: string; widths: number[]; preview?: string};
const assets: Record<string, Asset> = {...responsive, ...images};
const previews: Record<string, string> = inlinePreviews;

/** Real responsive URLs are present before hydration; recovery never depends on
 * the motion controller, video readiness or a hidden retry button. */
export default function HomeImage({wideSource, ...input}: ImageProps & {wideSource?: string}) {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (!wideSource) return;
    const query = matchMedia("(min-width: 768px)");
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [wideSource]);
  const cms = useContentAdapter();
  const chosen = wide && wideSource ? wideSource : input.src;
  const src = typeof chosen === "string" ? cms.url(chosen) : chosen;
  const asset = typeof src === "string" ? assets[src] : undefined;
  const preview = asset?.preview ?? (typeof src === "string" ? previews[src] : undefined);
  const media = useHomeMedia();
  const [decoded, setDecoded] = useState<string | null>(null);
  const loader = asset && !cms.preview ? ({width}: {width: number}) => `${asset.base}-${asset.widths.find(w => w >= width) ?? asset.widths.at(-1)}.webp` : input.loader;
  const unoptimized = cms.preview || (!asset && input.unoptimized);
  const full = getImageProps({...input, src, alt: input.alt, loader, unoptimized}).props;
  const low = typeof src === "string" ? homeLowSource(src) : undefined;
  const hasMedia = Boolean(media);
  useEffect(() => {
    if (!hasMedia || typeof src !== "string") return;
    let alive = true;
    const image = new window.Image();
    // Warm full quality concurrently; paint it only after decoding succeeds.
    if (full.sizes) image.sizes = full.sizes;
    if (full.srcSet) image.srcset = full.srcSet;
    image.src = full.src;
    void image.decode().then(() => {if (alive) setDecoded(src);}).catch(() => {});
    return () => {alive = false;};
  }, [hasMedia, src, full.src, full.srcSet, full.sizes]);
  const lowOnly = Boolean(media && (!media.prepared || decoded !== src) && low);
  return <RecoverableImage
    {...input} key={`${typeof src === 'string' ? src : src.toString()}-${lowOnly}`} src={lowOnly ? low! : src} alt={input.alt} home preview={preview}
    loading={media ? "eager" : input.loading}
    data-home-source={typeof src === "string" ? src : undefined}
    data-home-quality={lowOnly ? "480" : "full"}
    unoptimized={lowOnly || unoptimized}
    loader={lowOnly ? undefined : loader}
  />;
}
