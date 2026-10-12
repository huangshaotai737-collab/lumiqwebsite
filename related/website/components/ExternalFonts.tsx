"use client";

import { useEffect } from "react";

/** Optional language fonts must not block the first paint/loading screen. */
export default function ExternalFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+JP:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;600&family=Noto+Serif+JP:wght@400;600&family=Noto+Serif+TC:wght@400;600&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap";
    link.media = "print";
    link.onload = () => { link.media = "all"; };
    document.head.append(link);
    return () => { link.onload = null; link.remove(); };
  }, []);
  return null;
}
