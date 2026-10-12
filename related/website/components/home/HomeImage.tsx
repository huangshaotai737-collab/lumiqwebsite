"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import images from "@/lib/home-image-manifest.json";

type Asset = { base: string; widths: number[]; preview: string };
const assets: Record<string, Asset> = images;
const emptyPreview = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Reserve the artwork with an inline preview before loading an upcoming scene.
 * A lazy src alone can race the opening's pin layout and fetch distant products. */
export default function HomeImage(props: ImageProps) {
  const asset = typeof props.src === "string" ? assets[props.src] : undefined;
  const preview = asset?.preview ?? emptyPreview;
  const image = useRef<HTMLImageElement>(null);
  const [requested, setRequested] = useState(Boolean(props.priority || props.loading === "eager"));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const element = image.current;
    if (!element) return;
    const load = () => setRequested(true);
    const retry = () => setFailed(false);
    element.addEventListener("lumiq:load-image", load);
    window.addEventListener("lumiq:retry-images", retry);
    const section = element.closest<HTMLElement>("[data-home-section]");
    // Activation can precede a child effect, or a carousel can insert new images.
    if (section?.dataset.homeMediaRequested === "true") load();
    let observer: IntersectionObserver | undefined;
    if (!section) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { load(); observer?.disconnect(); }
      }, { rootMargin: "600px 0px" });
      observer.observe(element);
    }
    return () => {
      observer?.disconnect();
      element.removeEventListener("lumiq:load-image", load);
      window.removeEventListener("lumiq:retry-images", retry);
    };
  }, [props.src]);
  const showingPreview = !requested || failed;
  return <Image
    {...props}
    ref={image}
    alt={props.alt}
    data-home-image
    data-home-image-state={failed ? "error" : requested ? "requested" : "preview"}
    src={showingPreview ? preview : props.src}
    unoptimized={showingPreview || props.unoptimized}
    loading={requested && !props.priority ? "eager" : props.loading}
    loader={!showingPreview && asset ? ({ width }) => `${asset.base}-${asset.widths.find(w => w >= width) ?? asset.widths.at(-1)}.webp` : props.loader}
    placeholder={asset?.preview as `data:image/${string}` | undefined}
    onError={event => {
      if (!showingPreview) setFailed(true);
      props.onError?.(event);
    }}
  />;
}
