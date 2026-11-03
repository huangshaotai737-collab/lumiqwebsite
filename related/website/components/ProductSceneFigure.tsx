"use client";

import {useEffect, useId, useRef, useState, type ReactNode, type MouseEvent, type CSSProperties} from "react";
import {useTranslations} from "next-intl";
import Image from "@/components/content/ContentImage";
import {useVisualPreview} from "@/components/content/SiteContentProvider";
import {useContentAdapter} from "@/components/content/useContentAdapter";
import {productSceneFocus, type ProductFocus} from "@/lib/content/product-scene-focus";
import type {ProductVisual} from "@/components/ProductFeatureSection";
import "@/app/product-scene-figure.css";

/** One lifestyle scene inline; its device stays inside the same scene in the close-up. */
export default function ProductSceneFigure({image, caption, children, focus, detailViews}: {
  image?: ProductVisual;
  caption: string;
  children?: ReactNode;
  focus?: ProductFocus;
  detailViews?: {content: ReactNode; label: string}[];
}) {
  const t = useTranslations("BrandSceneDetails.orb");
  const cms = useContentAdapter();
  const visual = useVisualPreview();
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  // Resolve through the same CMS binding as the inline image, including draft media URLs.
  const bounds = focus ?? (image && Object.entries(productSceneFocus).find(([src]) => cms.url(src) === image.src)?.[1]);
  const current = detailViews?.[index];
  const action = t("productDetails");
  const imageContent = image && <Image src={image.src} alt={image.alt} width={1600} height={1200} sizes="(max-width: 900px) 100vw, 46vw" unoptimized={image.unoptimized} style={{objectPosition:image.position ?? "center"}} />;
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [open]);
  function show(event: MouseEvent<HTMLButtonElement>) {
    if (visual || !bounds) return;
    returnFocus.current = event.currentTarget;
    setIndex(0);
    setOpen(true);
    dialog.current?.showModal();
  }
  const cropStyle = bounds && {
    "--product-focus-ratio": (4 / 3) * bounds[2] / bounds[3],
    "--product-focus-left": `${-bounds[0] / bounds[2] * 100}%`,
    "--product-focus-top": `${-bounds[1] / bounds[3] * 100}%`,
    "--product-focus-width": `${10000 / bounds[2]}%`,
    "--product-focus-height": `${10000 / bounds[3]}%`,
  } as CSSProperties;
  return <figure className="product-scene-figure">
    {bounds ? <button className="product-scene-image" type="button" onClick={show} aria-label={`${action}：${caption}`} aria-haspopup="dialog">
      {children ?? imageContent}
    </button> : <div className="product-scene-image">{children ?? imageContent}</div>}
    <figcaption className="product-scene-caption">
      <span>{caption}</span>
      {bounds && <button className="product-scene-expand" type="button" onClick={show} aria-haspopup="dialog">{action} <span aria-hidden="true">↗</span></button>}
    </figcaption>
    <dialog ref={dialog} className="product-scene-dialog" aria-labelledby={labelId}
      onClose={() => {setOpen(false);returnFocus.current?.focus({preventScroll:true});}}
      onClick={event => {if(event.target === event.currentTarget) dialog.current?.close();}}>
      <div className="product-scene-dialog-content">
        <header><p id={labelId}>{caption}</p><button autoFocus type="button" aria-label={t("closeProduct")} onClick={() => dialog.current?.close()}>×</button></header>
        {open && bounds && <div className="product-focus-viewport" style={cropStyle}>
          <div className="product-focus-scene">
            {current?.content ?? children ?? (image && <Image src={image.src} alt={image.alt} width={1600} height={1200} sizes="100vw" unoptimized style={{objectPosition:image.position ?? "center"}} />)}
          </div>
        </div>}
        {!!detailViews?.length && <div className="product-scene-dialog-meta">
          <p aria-live="polite">{current?.label}</p>
          {detailViews.length > 1 && <div className="product-scene-pagination">
            <button type="button" aria-label={t("previous")} disabled={index===0} onClick={() => setIndex(i=>i-1)}>←</button>
            <span>{index+1} / {detailViews.length}</span>
            <button type="button" aria-label={t("next")} disabled={index===detailViews.length-1} onClick={() => setIndex(i=>i+1)}>→</button>
          </div>}
        </div>}
      </div>
    </dialog>
  </figure>;
}
