"use client";

import {useTranslations} from "next-intl";
import LoadingWordmark from "./LoadingWordmark";

export default function HomeLoading({percent, error, retry, prepared}: {
  percent: number; error: boolean; retry: () => void; prepared: boolean;
}) {
  const t = useTranslations("HomeRefresh.loading");
  return <>
    <div className="lh-loader" data-state={prepared ? "hidden" : error ? "error" : "loading"}
      role="dialog" aria-modal={!prepared} aria-label={t("label")}>
      <div className="lh-loader-center">
        <LoadingWordmark />
        <div className="lh-loader-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={Math.floor(percent)} aria-label={t("label")}>
          <span className="lh-loader-percent">{Math.floor(percent)}<small>%</small></span>
        </div>
        {error && <><p className="lh-loader-label" role="alert">{t("error")}</p>
          <div className="lh-loader-actions"><button autoFocus onClick={retry}>{t("retry")}</button></div></>}
      </div>
    </div>
    <noscript><style>{`.lh-loader{display:none!important}.lh-home[data-home-state]{visibility:visible!important}html:has(.lh-loader),body:has(.lh-loader){overflow:auto!important}body:has(.lh-loader) .site-nav,body:has(.lh-loader) .footer{visibility:visible!important}`}</style></noscript>
  </>;
}
