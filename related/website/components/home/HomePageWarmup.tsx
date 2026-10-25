"use client";

import {useEffect} from "react";
import {getImageProps, type ImageProps} from "next/image";
import {useRouter} from "next/navigation";
import {PrefetchKind} from "next/dist/client/components/router-reducer/router-reducer-types";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {useContentPreview, useVisualPreview} from "@/components/content/SiteContentProvider";

// Only public reading routes: never prefetch account, checkout, API or draft data.
const pages = [
  "/products", "/story", "/plans", "/faq", "/prelaunch",
  "/products/ola", "/products/tablet", "/products/ola-go", "/products/nest", "/products/print",
  "/about", "/contact", "/legal/privacy", "/legal/terms", "/legal/cookies", "/legal/child-safety",
];

// Match the displayed heroes' responsive image props so navigation reuses the
// same image cache entry, rather than downloading an additional original file.
const artwork: Array<Omit<ImageProps, "alt"> & {src: string}> = [
  {src:"/assets/products/lumiq-ola-tablet-hero.webp", width:1268, height:944, sizes:"(max-width: 820px) 100vw, 50vw"},
  ...[
    "/assets/web/ola-hero-front.webp",
    "/assets/tablet-detail/original-20260915/tablet-hero-original-transparent.png",
    "/assets/products/lumiq-ola-go.png",
    "/assets/products/lumiq-print.png",
  ].map(src => ({src, width:1600, height:1200, sizes:"(max-width: 900px) 100vw, 56vw"})),
  {src:"/assets/web/nest15-oak-angle.webp", width:1600, height:1200, unoptimized:true},
  {src:"/assets/western-scenes-20260908/lumiq-story-family-v3.webp", width:1600, height:1200, unoptimized:true},
];

type Connection = {saveData?: boolean; effectiveType?: string};

export default function HomePageWarmup() {
  const cms = useContentAdapter();
  const preview = useContentPreview();
  const visual = useVisualPreview();
  const router = useRouter();

  useEffect(() => {
    if (preview || visual) return;
    let disposed = false;
    let timer = 0;
    let idle = 0;
    let routeIndex = 0;
    let imageIndex = 0;
    const activeImages = new Map<HTMLImageElement, number>();
    const images = artwork.map(visual => getImageProps({...visual, src:cms.url(visual.src), alt:""}).props);
    const available = () => {
      const connection = (navigator as Navigator & {connection?: Connection}).connection;
      return !disposed && !document.hidden && navigator.onLine && !connection?.saveData &&
        !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
    };

    const warmImage = (props: (typeof images)[number]) => {
      const image = new window.Image();
      const finish = () => {
        window.clearTimeout(activeImages.get(image));
        activeImages.delete(image);
        image.onload = image.onerror = null;
      };
      image.onload = image.onerror = finish;
      image.decoding = "async";
      image.fetchPriority = "low";
      activeImages.set(image, window.setTimeout(() => {
        finish();
        image.removeAttribute("srcset");
        image.removeAttribute("src");
      }, 15000));
      if (props.sizes) image.sizes = props.sizes;
      if (props.srcSet) image.srcset = props.srcSet;
      image.src = props.src;
    };

    const schedule = () => {
      if (disposed || (routeIndex === pages.length && imageIndex === images.length)) return;
      timer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) {
          idle = window.requestIdleCallback(work, {timeout:1500});
        } else {
          work();
        }
      }, 900);
    };
    const work = () => {
      idle = 0;
      if (available()) {
        if (routeIndex < pages.length) {
          // Next 16's default AUTO skips dynamic page bodies. FULL warms the
          // existing router cache without rendering another page or its media.
          router.prefetch(`/${cms.locale}${pages[routeIndex++]}`, {kind:PrefetchKind.FULL});
        }
        while (activeImages.size < 2 && imageIndex < images.length) {
          warmImage(images[imageIndex++]);
        }
      }
      schedule();
    };

    // Do not wait for window.load (which also waits for media); leave the first
    // render and interactive controls a head start, then warm in small batches.
    timer = window.setTimeout(schedule, 1500);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
      for (const [image, timeout] of activeImages) {
        window.clearTimeout(timeout);
        image.onload = image.onerror = null;
        image.removeAttribute("srcset");
        image.removeAttribute("src");
      }
      activeImages.clear();
    };
  }, [cms, preview, visual, router]);

  return null;
}
