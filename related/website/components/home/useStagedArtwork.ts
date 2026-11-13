"use client";

import {useEffect, useState} from "react";
import {homeLowSource} from "./homeMediaSources";

/** CSS backgrounds/posters follow the same decoded-low → decoded-full handoff
 * as foreground HomeImage elements. A failed full image keeps its low fallback. */
export function useStagedArtwork(source: string, prepared: boolean) {
  const [decoded, setDecoded] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const image = new Image();
    image.fetchPriority = "low";
    image.src = source;
    void image.decode().then(() => {if (alive) setDecoded(source);}).catch(() => {});
    return () => {alive = false; image.src = "";};
  }, [source]);
  return prepared && decoded === source ? source : homeLowSource(source);
}
