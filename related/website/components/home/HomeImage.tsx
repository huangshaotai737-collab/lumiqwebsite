"use client";

import {useContentAdapter} from "@/components/content/useContentAdapter";
import type {ImageProps} from "next/image";
import RecoverableImage from "@/components/content/RecoverableImage";
import images from "@/lib/home-image-manifest.json";
import inlinePreviews from "@/lib/home-inline-previews.json";
import responsive from "@/lib/responsive-image-manifest.json";

type Asset = {base: string; widths: number[]; preview?: string};
const assets: Record<string, Asset> = {...responsive, ...images};
const previews: Record<string, string> = inlinePreviews;

/** Real responsive URLs are present before hydration; recovery never depends on
 * the motion controller, video readiness or a hidden retry button. */
export default function HomeImage(input: ImageProps) {
  const cms = useContentAdapter();
  const src = typeof input.src === "string" ? cms.url(input.src) : input.src;
  const asset = typeof src === "string" ? assets[src] : undefined;
  const preview = asset?.preview ?? (typeof src === "string" ? previews[src] : undefined);
  return <RecoverableImage
    {...input} key={typeof src === 'string' ? src : src.toString()} src={src} alt={input.alt} home preview={preview}
    unoptimized={cms.preview || (!asset && input.unoptimized)}
    loader={asset && !cms.preview ? ({width}) => `${asset.base}-${asset.widths.find(w => w >= width) ?? asset.widths.at(-1)}.webp` : input.loader}
  />;
}
