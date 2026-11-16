"use client";

import Image, {type ImageProps} from "next/image";
import {useEffect, useState} from "react";

type Props = ImageProps & {preview?: string; home?: boolean};

/** Bounded recovery: the first retry bypasses both the optimizer and generated
 * derivatives, then retries the original once. Never treat a tiny preview as a
 * successful image. Offline recovery waits for an actual online event. */
export default function RecoverableImage({preview, home, ...props}: Props) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!failed || attempt >= 2 || !navigator.onLine) return;
    const timer = window.setTimeout(() => {
      setAttempt(value => value + 1);
      setFailed(false);
    }, attempt === 0 ? 700 : 2000);
    return () => window.clearTimeout(timer);
  }, [failed, attempt]);
  useEffect(() => {
    const retry = () => {
      if (!failed) return;
      setAttempt(0);
      setFailed(false);
    };
    const visible = () => {if (!document.hidden && navigator.onLine) retry();};
    window.addEventListener("online", retry);
    window.addEventListener("lumiq:retry-images", retry);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", retry);
      window.removeEventListener("lumiq:retry-images", retry);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [failed]);
  const showingPreview = Boolean(failed && preview);
  let src = showingPreview ? preview! : props.src;
  // Retry the same original URL without bypassing authenticated preview routes
  // or changing signatures on external CMS URLs.
  if (!showingPreview && attempt === 2 && typeof src === 'string' && src.startsWith('/assets/')) {
    src += `${src.includes('?') ? '&' : '?'}image-retry=2`;
  }
  const state = failed ? "error" : loaded ? "loaded" : "requested";
  return <Image
    {...props}
    key={`${attempt}-${showingPreview}`}
    alt={props.alt}
    src={src}
    loader={attempt || showingPreview ? undefined : props.loader}
    unoptimized={Boolean(attempt || showingPreview || props.unoptimized)}
    placeholder={preview as `data:image/${string}` | undefined ?? props.placeholder}
    data-image-state={state}
    data-home-image={home || undefined}
    data-home-image-state={home ? state : undefined}
    onLoad={event => {
      if (showingPreview) return;
      setLoaded(true);
      setFailed(false);
      props.onLoad?.(event);
    }}
    onError={event => {
      if (showingPreview) return;
      setLoaded(false);
      setFailed(true);
      props.onError?.(event);
    }}
  />;
}
