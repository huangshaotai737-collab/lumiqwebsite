"use client";
import { useRef, useState, type FormEvent } from "react";
import { currencyMinorDigits, type Order } from "@/lib/generated/platform/commerce";
import type { StaffOrderDetail } from "./service";
function money(value: number, currency: string) {
  const digits = currencyMinorDigits[currency as keyof typeof currencyMinorDigits];
  if (digits === undefined) return `${currency} ${value}（最小單位）`;
  return new Intl.NumberFormat('zh-CN', {style:'currency',currency,currencyDisplay:'code',minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value / 10 ** digits);
}
export function OrderDetail({
  order,
  detail,
}: {
  order: Order;
  detail: StaffOrderDetail;
}) {
  const [notes, setNotes] = useState(detail.notes),
    [note, setNote] = useState(""),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  const busy = useRef(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const r = await (
        await fetch(`/api/orders/${order.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
          cache: "no-store",
        })
      ).json();
      if (r.ok) {
        setNote("");
        const fresh = await (
          await fetch(`/api/orders/${order.id}/notes`, { cache: "no-store" })
        ).json();
        if (fresh.ok) {
          setNotes(fresh.data.notes);
          setMessage("備註已保存。");
        } else {
          setNotes([]);
          setMessage("備註已保存，但無法重新讀取。");
        }
      } else {
        setMessage("備註未保存，權限可能已失效，請重試。");
        if (r.error === "FORBIDDEN" || r.error === "UNAUTHENTICATED")
          setNotes([]);
      }
    } catch {
      setMessage("結果未確認，請刷新檢查備註後再重試。");
    }
    busy.current = false;
    setPending(false);
  }
  return (
    <>
      <h1>訂單詳情</h1>
      <section className="panel order-workspace">
        <h2>{order.id}</h2>
        <p>
          {order.status === "cancelled" ? "已取消" : "待支付開放"} ·
          支付尚未開通 · 配送尚未安排
        </p>
        <p>不創建交易，不支持手工改爲已付款或已發貨。</p>
        <p>會員：{order.userId}</p>
        <ul>
          {order.items.map((i) => (
            <li key={i.skuId}>
              {i.name} × {i.quantity} · {money(i.unitMinor, order.currency)}（單價）
            </li>
          ))}
        </ul>
        <p>
          商品小計：{money(order.totals.itemsMinor, order.currency)}
        </p>
        <p>運費、稅額、最終應付總額：待確認</p>
        <h2>收件資料</h2>
        <dl>
          {Object.entries({
            name: "收件人",
            country: "國家",
            region: "地區",
            city: "城市",
            postalCode: "郵編",
            line1: "地址一",
            line2: "地址二",
            phone: "電話",
          }).map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd style={{ whiteSpace: "pre-wrap" }}>
                {detail.shippingAddress[
                  key as keyof typeof detail.shippingAddress
                ] || "—"}
              </dd>
            </div>
          ))}
        </dl>
        <p>條款版本：{detail.termsVersion}</p>
        <p>取消記錄：{detail.cancelledAt || "尚無取消記錄"}</p>
      </section>
      <section className="panel order-workspace">
        <h2>內部備註</h2>
        <p>僅管理員和運營可見。</p>
        <ul>
          {notes.map((n) => (
            <li key={n.id}>
              <p style={{ whiteSpace: "pre-wrap" }}>{n.note}</p>
              <time>{n.createdAt}</time>
            </li>
          ))}
        </ul>
        <form method="POST" onSubmit={submit}>
          <fieldset disabled={pending}>
            <label>
              添加內部備註
              <textarea
                required
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button className="primary-button">{pending ? "保存中…" : "保存備註"}</button>
          </fieldset>
        </form>
        <p role="status">{message}</p>
      </section>
    </>
  );
}
