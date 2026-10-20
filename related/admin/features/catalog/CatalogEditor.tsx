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
        ? "配置已被修改。请先保留当前输入，再刷新页面重试。"
        : result.error === "FORBIDDEN"
          ? "权限已失效，请重新登录。"
          : "保存失败，请检查金额、确认状态和已发布条款后重试。";
  } catch {
    return "网络连接失败，请重试。";
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
      <section className="panel">
        <h2>{offering.name}</h2>
        <p>随 Ola 配套展示，不独立收费，不开放单独下单。</p>
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
      setMessage("请选择币种并输入安全范围内的非负整数金额。");
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
    <section className="panel">
      <h2>{offering.name}</h2>
      <p>
        {offering.confirmed ? "商业价格已确认" : "商业价格待确认"} ·{" "}
        {offering.enabled ? "SKU 已启用" : "SKU 未启用"}
      </p>
      <form onSubmit={submit}>
        <fieldset className="content-fieldset" disabled={pending || saved}>
          <div className="content-field">
            <label htmlFor={"currency-" + offering.skuId}>币种</label>
            <select
              id={"currency-" + offering.skuId}
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              required
            >
              <option value="">请选择币种</option>
              {Object.keys(currencyMinorDigits).map((code) => (
                <option key={code}>{code}</option>
              ))}
            </select>
          </div>
          <div className="content-field">
            <label htmlFor={"amount-" + offering.skuId}>
              单价（币种最小单位整数）
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
                ? "请先选择币种。"
                : digits === 0
                  ? "该币种没有小数单位，输入 100 表示 100 元。"
                  : "输入 100 表示 1.00，输入 123 表示 1.23。"}{" "}
              不自动换汇。
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
              我已确认此 SKU 的实际商业价格
            </label>
            <label>
              <input
                type="checkbox"
                checked={enabled}
                disabled={!confirmed}
                onChange={(e) => setEnabled(e.target.checked)}
              />{" "}
              允许此 SKU 下单
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
    setMessage(error || "订单设置已保存。");
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
            ? "订单提交已开放"
            : "条款已变化，订单提交暂停，等待重新批准"
          : "订单提交已关闭"}
      </p>
      <h2>条款批准与订单开关</h2>
      <p>
        仅可批准当前已发布版本。法律条款或运费、退货、保修承诺发生变化后，新的订单会停止接受，需重新批准。
      </p>
      <p className="content-path">
        已批准版本：{initial.settings.termsReleaseId || "尚未批准"}
        <br />
        当前发布版本：{initial.publishedReleaseId || "尚未发布"}
      </p>
      <Link href="/content">查看已发布内容及商业条款</Link>
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
              我已审核并批准当前已发布的三种语言商业条款
            </label>
            <label>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />{" "}
              开放订单提交
            </label>
          </div>
          <button className="primary-button">
            {pending ? "正在保存…" : "保存订单设置"}
          </button>
        </fieldset>
      </form>
      <p role="status">{message}</p>
    </section>
  );
}

export function CatalogEditor({ initial }: { initial: CatalogWorkspace }) {
  return (
    <>
      <div className="notice">
        当前仅保存待付款配置订单。运费、税费和应付总额均待确认；付款渠道未开通，配送未安排。后续付款前须补齐有效总价并由顾客确认。
      </div>
      {initial.offerings.map((offering) => (
        <OfferingEditor
          key={offering.skuId + "-" + offering.version}
          offering={offering}
        />
      ))}
      <CommerceEditor
        key={initial.settings.version + ":" + initial.publishedReleaseId}
        initial={initial}
      />
    </>
  );
}
