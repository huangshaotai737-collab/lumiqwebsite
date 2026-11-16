"use client";

import {useEffect} from "react";
import {useRouter} from "next/navigation";
import {PrefetchKind} from "next/dist/client/components/router-reducer/router-reducer-types";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {useContentPreview, useVisualPreview} from "@/components/content/SiteContentProvider";
import {hasPendingHomeArtwork} from "./preloadScenes";

// Warm just the primary public destinations. Do not download another page's
// large hero images or private/account data while someone is reading home.
const pages = ["/products", "/story", "/plans", "/faq", "/prelaunch"];
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
    const work = () => {
      idle = 0;
      const connection = (navigator as Navigator & {connection?: Connection}).connection;
      if (!disposed && !document.hidden && navigator.onLine && !connection?.saveData &&
        !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "") && !hasPendingHomeArtwork()) {
        router.prefetch(`/${cms.locale}${pages[routeIndex++]}`, {kind: PrefetchKind.FULL});
      }
      if (!disposed && routeIndex < pages.length) schedule();
    };
    const schedule = () => {
      timer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) idle = window.requestIdleCallback(work, {timeout:1500});
        else work();
      }, 900);
    };
    timer = window.setTimeout(schedule, 1500);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback(idle);
    };
  }, [cms, preview, visual, router]);
  return null;
}
