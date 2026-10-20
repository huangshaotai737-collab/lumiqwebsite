"use client";
import { useRef, useState, type FormEvent } from "react";
import type { Order } from "@/lib/generated/platform/commerce";
import type { StaffOrderDetail } from "./service";
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
          setMessage("备注已保存。");
        } else {
          setNotes([]);
          setMessage("备注已保存，但无法重新读取。");
        }
      } else {
        setMessage("备注未保存，权限可能已失效，请重试。");
        if (r.error === "FORBIDDEN" || r.error === "UNAUTHENTICATED")
          setNotes([]);
      }
    } catch {
      setMessage("结果未确认，请刷新检查备注后再重试。");
    }
    busy.current = false;
    setPending(false);
  }
  return (
    <>
      <h1>订单详情</h1>
      <section className="panel order-workspace">
        <h2>{order.id}</h2>
        <p>
          {order.status === "cancelled" ? "已取消" : "待支付开放"} ·
          支付尚未开通 · 配送尚未安排
        </p>
        <p>不创建交易，不支持手工改为已付款或已发货。</p>
        <p>会员：{order.userId}</p>
        <ul>
          {order.items.map((i) => (
            <li key={i.skuId}>
              {i.name} × {i.quantity} · {order.currency} {i.unitMinor}
              （单价最小单位）
            </li>
          ))}
        </ul>
        <p>
          商品小计：{order.currency} {order.totals.itemsMinor}（最小单位）
        </p>
        <p>运费、税额、最终应付总额：待确认</p>
        <h2>收件资料</h2>
        <dl>
          {Object.entries({
            name: "收件人",
            country: "国家",
            region: "地区",
            city: "城市",
            postalCode: "邮编",
            line1: "地址一",
            line2: "地址二",
            phone: "电话",
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
        <p>条款版本：{detail.termsVersion}</p>
        <p>取消记录：{detail.cancelledAt || "尚无取消记录"}</p>
      </section>
      <section className="panel order-workspace">
        <h2>内部备注</h2>
        <p>仅管理员和运营可见。</p>
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
              添加内部备注
              <textarea
                required
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button>{pending ? "保存中…" : "保存备注"}</button>
          </fieldset>
        </form>
        <p role="status">{message}</p>
      </section>
    </>
  );
}
