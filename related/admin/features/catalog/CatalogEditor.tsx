"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  currencyMinorDigits,
  type CatalogOffering,
  type CatalogWorkspace,
} from "@/lib/generated/platform/commerce";
async function save(url: string, input: unknown): Promise<string> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const result = await response.json();
    return response.ok && result.ok
      ? ""
      : result.error === "CONFLICT"
        ? "配置已被修改。請先保留當前輸入，再刷新頁面重試。"
        : result.error === "FORBIDDEN"
          ? "權限已失效，請重新登錄。"
          : "保存失敗，請檢查金額、確認狀態和已發佈條款後重試。";
  } catch {
    return "網絡連接失敗，請重試。";
  }
}
function OfferingEditor({ offering }: { offering: CatalogOffering }) {
  const router = useRouter(),
    busy = useRef(false);
  const [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [currency, setCurrency] = useState(offering.currency || ""),
    [amount, setAmount] = useState(
      offering.unitMinor === null ? "" : String(offering.unitMinor),
    ),
    [confirmed, setConfirmed] = useState(offering.confirmed),
    [enabled, setEnabled] = useState(offering.enabled),
    [saved, setSaved] = useState(false);
  if (offering.productId === "ola-go")
    return (
      <section className="panel sku-card">
        <h2>{offering.name}</h2>
        <p>隨 Ola 配套展示，不獨立收費，不開放單獨下單。</p>
      </section>
    );
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || saved) return;
    if (
      !/^\d+$/.test(amount) ||
      !Number.isSafeInteger(Number(amount)) ||
      !currency
    ) {
      setMessage("請選擇幣種並輸入安全範圍內的非負整數金額。");
      return;
    }
    busy.current = true;
    setPending(true);
    setMessage("");
    const error = await save("/api/catalog/update", {
      skuId: offering.skuId,
      currency,
      unitMinor: Number(amount),
      confirmed,
      enabled,
      expectedVersion: offering.version,
    });
    setMessage(error || "已保存。");
    if (!error) {
      setSaved(true);
      router.refresh();
    }
    setPending(false);
    busy.current = false;
  }
  const digits =
    currencyMinorDigits[currency as keyof typeof currencyMinorDigits];
  return (
    <section className="panel sku-card">
      <h2>{offering.name}</h2>
      <p>
        {offering.confirmed ? "商業價格已確認" : "商業價格待確認"} ·{" "}
        {offering.enabled ? "SKU 已啟用" : "SKU 未啟用"}
      </p>
      <form onSubmit={submit}>
        <fieldset className="content-fieldset" disabled={pending || saved}>
          <div className="content-field">
            <label htmlFor={"currency-" + offering.skuId}>幣種</label>
            <select
              id={"currency-" + offering.skuId}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              required
            >
              <option value="">請選擇幣種</option>
              {Object.keys(currencyMinorDigits).map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="content-field">
            <label htmlFor={"amount-" + offering.skuId}>
              單價（幣種最小單位整數）
            </label>
            <input
              id={"amount-" + offering.skuId}
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <small>
              {digits === undefined
                ? "請先選擇幣種。"
                : digits === 0
                  ? "該幣種沒有小數單位，輸入 100 表示 100 元。"
                  : "輸入 100 表示 1.00，輸入 123 表示 1.23。"}{" "}
              不自動換匯。
            </small>
          </div>
          <div className="content-field">
            <label>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => {
                  setConfirmed(e.target.checked);
                  if (!e.target.checked) setEnabled(false);
                }}
              />{" "}
              我已確認此 SKU 的實際商業價格
            </label>
            <label>
              <input
                type="checkbox"
                checked={enabled}
                disabled={!confirmed}
                onChange={(e) => setEnabled(e.target.checked)}
              />{" "}
              允許此 SKU 下單
            </label>
          </div>
          <button className="primary-button">
            {pending ? "正在保存…" : "保存 " + offering.name}
          </button>
        </fieldset>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}
function CommerceEditor({ initial }: { initial: CatalogWorkspace }) {
  const router = useRouter(),
    busy = useRef(false);
  const [enabled, setEnabled] = useState(initial.settings.ordersEnabled),
    [approved, setApproved] = useState(false),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [saved, setSaved] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current || saved) return;
    busy.current = true;
    setPending(true);
    setMessage("");
    const error = await save("/api/catalog/settings", {
      ordersEnabled: enabled,
      termsReleaseId: approved
        ? initial.publishedReleaseId
        : enabled
          ? initial.settings.termsReleaseId
          : null,
      expectedVersion: initial.settings.version,
    });
    setMessage(error || "訂單設置已保存。");
    if (!error) {
      setSaved(true);
      router.refresh();
    }
    setPending(false);
    busy.current = false;
  }
  return (
    <section className="panel">
      <p>
        {initial.settings.ordersEnabled
          ? initial.termsCurrent
            ? "訂單提交已開放"
            : "條款已變化，訂單提交暫停，等待重新批准"
          : "訂單提交已關閉"}
      </p>
      <h2>條款批准與訂單開關</h2>
      <p>
        僅可批准當前已發佈版本。法律條款或運費、退貨、保修承諾發生變化後，新的訂單會停止接受，需重新批准。
      </p>
      <p className="content-path">
        已批准版本：{initial.settings.termsReleaseId || "尚未批准"}
        <br />
        當前發佈版本：{initial.publishedReleaseId || "尚未發佈"}
      </p>
      <Link href="/content">查看已發佈內容及商業條款</Link>
      <form onSubmit={submit}>
        <fieldset className="content-fieldset" disabled={pending || saved}>
          <div className="content-field">
            <label>
              <input
                type="checkbox"
                checked={approved}
                disabled={!initial.publishedReleaseId}
                onChange={(e) => setApproved(e.target.checked)}
              />{" "}
              我已審核並批准當前已發佈的三種語言商業條款
            </label>
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />{" "}
              開放訂單提交
            </label>
          </div>
          <button className="primary-button">
            {pending ? "正在保存…" : "保存訂單設置"}
          </button>
        </fieldset>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}

export function CatalogEditor({ initial, readOnly = false }: { initial: CatalogWorkspace; readOnly?: boolean }) {
  if (readOnly) return <>
    <p className="notice">運營只讀：實際 SKU、價格、確認狀態及訂單提交配置。修改與條款批准僅限管理員。</p>
    <div className="catalog-grid">{initial.offerings.map(offering=><section className="panel sku-card" key={offering.skuId}>
      <h2>{offering.name}</h2>
      <p>SKU：{offering.skuId}</p>
      <p>{offering.confirmed ? "商業價格已確認" : "商業價格待確認"} · {offering.enabled ? "SKU 已啟用" : "SKU 未啟用"}</p>
      <p>幣種：{offering.currency || "未配置"} · 單價（幣種最小單位整數）：{offering.unitMinor ?? "未配置"}</p>
      {offering.productId === "ola-go" && <p>隨 Ola 配套展示，不獨立收費，不開放單獨下單。</p>}
    </section>)}</div>
    <section className="panel"><h2>訂單提交配置</h2>
      <p>全局開關：{initial.settings.ordersEnabled ? "已開放" : "已關閉"}</p>
      <p>條款：{initial.termsCurrent ? "當前有效" : "尚未批准或已變化，訂單提交暫停"}</p>
      <p>已批准版本：{initial.settings.termsReleaseId || "尚未批准"}</p>
      <p>當前發佈版本：{initial.publishedReleaseId || "尚未發佈"}</p>
    </section>
  </>;
  return (
    <>
      <div className="notice">
        當前僅保存待付款配置訂單。運費、稅費和應付總額均待確認；付款渠道未開通，配送未安排。後續付款前須補齊有效總價並由顧客確認。
      </div>
      <div className="catalog-grid">{initial.offerings.map((offering) => (
        <OfferingEditor
          key={offering.skuId + "-" + offering.version}
          offering={offering}
        />
      ))}</div>
      <CommerceEditor
        key={initial.settings.version + ":" + initial.publishedReleaseId}
        initial={initial}
      />
    </>
  );
}
