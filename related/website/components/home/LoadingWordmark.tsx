"use client";

import { useEffect, useId, useState, type CSSProperties } from "react";
import { loadingLogo } from "./prepareHome";

// Isolate characters of the original artwork, preserving the exact brand shapes.
const letters = [
  ["L", 130, 450, 700, 730], ["U", 880, 450, 830, 730],
  ["M", 1800, 450, 950, 730], ["i", 2840, 595, 220, 590],
  ["Q", 3150, 430, 840, 780], ["accent", 2840, 340, 240, 230],
  ["S", 800, 1290, 180, 190], ["T", 1240, 1290, 170, 190],
  ["U", 1660, 1290, 200, 190], ["D", 2110, 1290, 200, 190],
  ["I", 2570, 1290, 150, 190], ["O", 2930, 1290, 230, 190],
] as const;

export default function LoadingWordmark() {
  const id = useId().replace(/:/g, "");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    const image = new Image();
    image.src = loadingLogo;
    void image.decode().then(() => { if (active) setReady(true); }).catch(() => {
      // The resource gate owns error handling and the retry action.
    });
    return () => { active = false; };
  }, []);
  return <svg className="lh-loader-wordmark" data-ready={ready} viewBox="110 300 3900 1230" aria-hidden="true">
    <defs>
      <image id={`${id}-art`} href={loadingLogo} width="4096" height="1551" />
      {letters.map(([, x, y, width, height], index) => <clipPath id={`${id}-${index}`} key={index}>
        <rect x={x} y={y} width={width} height={height} />
      </clipPath>)}
    </defs>
    {letters.map(([letter], index) => <g key={index}
      className={`lh-loader-letter ${index > 5 ? "lh-loader-studio" : ""} ${letter === "accent" ? "lh-loader-accent" : ""}`}
      style={{ "--letter-index": index > 5 ? index - 6 : index } as CSSProperties}>
      <g className="lh-loader-letter-float">
        <g clipPath={`url(#${id}-${index})`}><use href={`#${id}-art`} /></g>
      </g>
    </g>)}
  </svg>;
}
