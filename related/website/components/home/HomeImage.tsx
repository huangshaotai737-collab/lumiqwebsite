"use client";

import {useContentAdapter} from "@/components/content/useContentAdapter";
import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import images from "@/lib/home-image-manifest.json";
import inlinePreviews from "@/lib/home-inline-previews.json";

type Asset = { base: string; widths: number[]; preview: string };
const assets: Record<string, Asset> = images;
const previews: Record<string, string> = inlinePreviews;

/** Put real image URLs in the server HTML so downloads do not wait for motion
 * hydration. Native lazy loading handles distant scenes; previews cover loading
 * and failed requests without changing the reserved image dimensions. */
export default function HomeImage(input: ImageProps) {
  const cms = useContentAdapter();
  const props = {...input, src: typeof input.src === "string" ? cms.url(input.src) : input.src};
  const asset = typeof props.src === "string" ? assets[props.src] : undefined;
  const preview = asset?.preview ?? (typeof props.src === "string" ? previews[props.src] : undefined);
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(null);
  const failed = failedSource === props.src;
  useEffect(() => {
    const retry = () => setFailedSource(null);
    window.addEventListener("lumiq:retry-images", retry);
    return () => window.removeEventListener("lumiq:retry-images", retry);
  }, []);
  const showingPreview = Boolean(preview && failed);
  return <Image
    {...props}
    alt={props.alt}
    data-home-image
    data-home-image-state={failed ? "error" : "requested"}
    src={showingPreview && preview ? preview : props.src}
    unoptimized={showingPreview || props.unoptimized || cms.preview}
    loader={!showingPreview && asset ? ({ width }) => `${asset.base}-${asset.widths.find(w => w >= width) ?? asset.widths.at(-1)}.webp` : props.loader}
    placeholder={preview as `data:image/${string}` | undefined}
    onLoad={event => {
      if (!showingPreview) setFailedSource(null);
      props.onLoad?.(event);
    }}
    onError={event => {
      if (!showingPreview) setFailedSource(props.src);
      props.onError?.(event);
    }}
  />;
}
