"use client";

import {useEffect, useId, useRef, useState, type ReactNode, type MouseEvent} from "react";
import {useTranslations} from "next-intl";
import Image from "@/components/content/ContentImage";
import {useVisualPreview} from "@/components/content/SiteContentProvider";
import type {ProductVisual} from "@/components/ProductFeatureSection";
import "@/app/product-scene-figure.css";

/** One inline lifestyle image; original photos / supplied UI load only when opened. */
export default function ProductSceneFigure({image, caption, children, details, screenDetails = false}: {
  image?: ProductVisual;
  caption: string;
  children?: ReactNode;
  details?: ProductVisual[];
  screenDetails?: boolean;
}) {
  const t = useTranslations("BrandSceneDetails.orb");
  const visual = useVisualPreview();
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const images = details?.length ? details : image ? [image] : [];
  const current = images[index] ?? images[0];
  const action = t(screenDetails ? "closeup" : "photoDetails");
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  function show(event: MouseEvent<HTMLButtonElement>) {
    if (visual || !images.length) return;
    returnFocus.current = event.currentTarget;
    setIndex(0);
    setOpen(true);
    dialog.current?.showModal();
  }
  return <figure className="product-scene-figure">
    <button className="product-scene-image" type="button" onClick={show} aria-label={`${action}：${caption}`} aria-haspopup="dialog">
      {children ?? (image && <Image src={image.src} alt={image.alt} width={1600} height={1200} sizes="(max-width: 900px) 100vw, 46vw" unoptimized={image.unoptimized} style={{objectPosition:image.position ?? "center"}} />)}
    </button>
    <figcaption className="product-scene-caption">
      <span>{caption}</span>
      <button className="product-scene-expand" type="button" onClick={show} aria-haspopup="dialog">{action} <span aria-hidden="true">↗</span></button>
    </figcaption>
    <dialog ref={dialog} className="product-scene-dialog" aria-labelledby={labelId}
      onClose={() => {setOpen(false);returnFocus.current?.focus({preventScroll:true});}}
      onClick={event => {if(event.target === event.currentTarget) dialog.current?.close();}}>
      <div className="product-scene-dialog-content">
        <header><p id={labelId}>{caption}</p><button autoFocus type="button" aria-label={t("closePhoto")} onClick={() => dialog.current?.close()}>×</button></header>
        {open && current && <Image className="product-scene-detail" src={current.src} alt={current.alt} width={1920} height={1440} sizes="94vw" unoptimized />}
        <div className="product-scene-dialog-meta">
          <p aria-live="polite">{current?.alt}</p>
          {images.length > 1 && <div className="product-scene-pagination">
            <button type="button" aria-label={t("previous")} disabled={index===0} onClick={() => setIndex(i=>i-1)}>←</button>
            <span>{index+1} / {images.length}</span>
            <button type="button" aria-label={t("next")} disabled={index===images.length-1} onClick={() => setIndex(i=>i+1)}>→</button>
          </div>}
        </div>
      </div>
    </dialog>
  </figure>;
}
