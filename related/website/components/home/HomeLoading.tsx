"use client";

import {useTranslations} from "next-intl";
import {useCallback, useEffect, useRef, useState} from "react";
import LoadingWordmark from "./LoadingWordmark";

export default function HomeLoading({percent, error, retry, prepared, onIntroComplete}: {
  percent: number; error: boolean; retry: () => void; prepared: boolean; onIntroComplete: () => void;
}) {
  const t = useTranslations("HomeRefresh.loading");
  const root = useRef<HTMLDivElement>(null);
  const [logoReady, setLogoReady] = useState(false);
  const markLogoReady = useCallback(() => setLogoReady(true), []);
  useEffect(() => {
    const element = root.current;
    if (!element || !logoReady) return;
    const parts = [...element.querySelectorAll('.lh-loader-letter, .lh-loader-progress')];
    let frame: number;
    const check = () => {
      if (parts.every(part => part.getAnimations().every(animation => animation.playState === 'finished'))) {
        // Keep a fully painted frame before replacing the loading page.
        frame = requestAnimationFrame(onIntroComplete);
      }
    };
    element.addEventListener('animationend', check);
    element.addEventListener('animationcancel', check);
    frame = requestAnimationFrame(check);
    return () => {
      cancelAnimationFrame(frame);
      element.removeEventListener('animationend', check);
      element.removeEventListener('animationcancel', check);
    };
  }, [logoReady, onIntroComplete]);
  return <>
    <div ref={root} className="lh-loader" data-logo-ready={logoReady} data-state={prepared ? "hidden" : error ? "error" : "loading"}
      role="dialog" aria-modal={!prepared} aria-label={t("label")}>
      <div className="lh-loader-center">
        <LoadingWordmark onReady={markLogoReady} />
        <div className="lh-loader-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.floor(percent)} aria-label={t("label")}>
          <span className="lh-loader-percent">{Math.floor(percent)}<small>%</small></span>
        </div>
        {error && <><p className="lh-loader-label" role="alert">{t("error")}</p>
          <div className="lh-loader-actions"><button autoFocus onClick={retry}>{t("retry")}</button></div></>}
      </div>
    </div>
    <noscript><style>{`.lh-loader,.lumiq-root[data-home-entry]::after{display:none!important}.lh-home[data-home-state]{visibility:visible!important}html:has(.lh-loader),body:has(.lh-loader){overflow:auto!important}body:has(.lh-loader) .site-nav,body:has(.lh-loader) .footer{visibility:visible!important}`}</style></noscript>
  </>;
}
