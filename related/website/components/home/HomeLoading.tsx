"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useTranslations } from "next-intl";
import { prepareHome } from "./prepareHome";
import LoadingWordmark from "./LoadingWordmark";

const visitKey = "lumiq-home-ready-20260907-v1";

export default function HomeLoading({ root, onPrepared, onOpened }: {
  root: RefObject<HTMLElement | null>;
  onPrepared: () => void;
  onOpened: () => void;
}) {
  const t = useTranslations("HomeRefresh.loading");
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState("loading");
  const [percent, setPercent] = useState(0);
  const overlay = useRef<HTMLDivElement>(null);
  const target = useRef(0);
  const shown = useRef(0);
  const complete = useRef(false);
  const opened = useRef(false);
  const retryButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!root.current) return;
    const main = root.current;
    const controller = new AbortController();
    let disposed = false;
    let url: string | undefined;
    let frame = 0;
    let exitTimer: ReturnType<typeof setTimeout>;
    let wordmarkStarted: number | undefined;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let returning = false;
    try { returning = sessionStorage.getItem(visitKey) === "ready"; } catch { /* storage is optional */ }
    overlay.current?.setAttribute("data-returning", String(returning));
    target.current = shown.current = 0;
    complete.current = opened.current = false;
    setPercent(0);
    setPhase("loading");
    const shell = Array.from(document.querySelectorAll<HTMLElement>(".site-nav, .footer"));
    const wasInert = shell.map(element => element.inert);
    shell.forEach(element => { element.inert = true; });

    const reveal = () => {
      if (opened.current) return;
      opened.current = true;
      setPhase("revealing");
      onPrepared();
      exitTimer = setTimeout(() => {
        setPhase("hidden");
        shell.forEach((element, i) => { element.inert = wasInert[i]; });
        onOpened();
      }, reduced ? 0 : 1100);
    };
    const tick = () => {
      // The LFS-backed mark is optional in a fresh development clone. Let the
      // progress gate finish with its CSS preview instead of keeping the page
      // hidden behind a logo that cannot decode yet.
      if (wordmarkStarted === undefined && (process.env.NODE_ENV === "development" || overlay.current?.querySelector('.lh-loader-wordmark[data-ready="true"]'))) {
        wordmarkStarted = performance.now();
      }
      shown.current += (target.current - shown.current) * (reduced || returning ? 1 : 0.12);
      if (target.current - shown.current < 0.08) shown.current = target.current;
      const value = Math.floor(shown.current);
      setPercent(value);
      if (complete.current && value === 100 && wordmarkStarted !== undefined &&
        performance.now() - wordmarkStarted >= (reduced ? 0 : returning ? 750 : 1750)) {
        reveal();
        return;
      }
      if (!disposed) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const timeout = () => controller.abort(new Error("Loading made no progress"));
    let deadline = setTimeout(timeout, 30000);
    const progress = (value: number) => {
      if (value > target.current) {
        clearTimeout(deadline);
        deadline = setTimeout(timeout, 30000);
      }
      target.current = value;
    };
    // Retrying resets any image that previously switched to a preview.
    window.dispatchEvent(new Event("lumiq:retry-images"));
    const begin = requestAnimationFrame(() => {
      if (disposed) return;
      void prepareHome(main, controller.signal, progress, value => { url = value; })
        .then(() => {
          if (disposed) return;
          clearTimeout(deadline);
          complete.current = true;
          try { sessionStorage.setItem(visitKey, "ready"); } catch { /* storage is optional */ }
        }).catch(() => {
          if (disposed) return;
          clearTimeout(deadline);
          controller.abort();
          cancelAnimationFrame(frame);
          setPhase("error");
        });
    });
    const continueEvent = () => { clearTimeout(deadline); controller.abort(); reveal(); };
    const element = overlay.current;
    element?.addEventListener("lumiq:continue", continueEvent);
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(deadline);
      clearTimeout(exitTimer);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(begin);
      element?.removeEventListener("lumiq:continue", continueEvent);
      shell.forEach((element, i) => { element.inert = wasInert[i]; });
      if (url) {
        URL.revokeObjectURL(url);
        main.querySelector("video")?.removeAttribute("data-prepared-src");
      }
    };
  }, [attempt, root, onPrepared, onOpened]);

  useEffect(() => { if (phase === "error") retryButton.current?.focus(); }, [phase]);

  return <>
    <div ref={overlay} className="lh-loader" data-state={phase} role="dialog" aria-modal={phase !== "hidden"} aria-label={t("label")}>
      <div className="lh-loader-center" key={attempt}>
        <LoadingWordmark />
        <div className="lh-loader-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={t("label")}>
          <span className="lh-loader-percent">{percent}<small>%</small></span>
        </div>
        {phase === "error" && <p className="lh-loader-label" role="alert">{t("error")}</p>}
        {phase === "error" && <div className="lh-loader-actions">
          <button ref={retryButton} onClick={() => setAttempt(value => value + 1)}>{t("retry")}</button>
          <button onClick={() => overlay.current?.dispatchEvent(new Event("lumiq:continue"))}>{t("continue")}</button>
        </div>}
      </div>
    </div>
    <noscript><style>{`.lh-loader{display:none!important}.lh-home[data-home-state]{visibility:visible!important}html:has(.lh-loader),body:has(.lh-loader){overflow:auto!important}body:has(.lh-loader) .site-nav,body:has(.lh-loader) .footer{visibility:visible!important}`}</style></noscript>
  </>;
}
