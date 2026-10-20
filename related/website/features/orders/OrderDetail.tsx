"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/generated/platform/core";
import type { Order } from "@/lib/generated/platform/commerce";
import { accountRevisionKey } from "@/features/account/session-event";
import { orderCopy } from "./copy";
import { orderMoney } from "./money";
export function OrderDetail({ locale, id }: { locale: Locale; id: string }) {
  const t = orderCopy[locale];
  const [order, setOrder] = useState<Order | null>(null),
    [message, setMessage] = useState(t.loading),
    [pending, setPending] = useState(false),
    [refresh, setRefresh] = useState(0);
  const busy = useRef(false);
  const identityGeneration = useRef(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const abort = new AbortController();
    async function load() {
      const current = ++sequence;
      setOrder(null);
      setMessage(t.loading);
      try {
        const result = await (
          await fetch(`/api/orders/${encodeURIComponent(id)}`, {
            cache: "no-store",
            signal: abort.signal,
          })
        ).json();
        if (active && current === sequence) {
          setOrder(result.ok ? result.data : null);
          setMessage(result.ok ? "" : t.failed);
        }
      } catch {
        if (active && current === sequence) setMessage(t.failed);
      }
    }
    const hide = () => {
      identityGeneration.current++;
      sequence++;
      setOrder(null);
    };
    const show = () => {
      hide();
      void load();
    };
    void load();
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    window.addEventListener("focus", show);
    const changed = (event: StorageEvent) => {
      if (event.key === accountRevisionKey) show();
    };
    window.addEventListener("storage", changed);
    return () => {
      active = false;
      abort.abort();
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      window.removeEventListener("focus", show);
      window.removeEventListener("storage", changed);
    };
  }, [id, t, refresh]);
  async function cancel() {
    if (busy.current) return;
    busy.current = true;
    const generation = identityGeneration.current;
    setPending(true);
    try {
      const result = await (
        await fetch(`/api/orders/${id}/cancel`, {
          method: "POST",
          cache: "no-store",
        })
      ).json();
      if (generation !== identityGeneration.current) {
        busy.current = false;
        setPending(false);
        return;
      }
      if (result.ok) {
        setOrder(result.data);
        setMessage("");
      } else {
        setOrder(null);
        setMessage(t.failed);
      }
    } catch {
      setMessage(t.failed);
    }
    busy.current = false;
    setPending(false);
  }
  return (
    <>
      <p role="status">{message}</p>
      {order && (
        <section className="orders-card">
          <h1>{order.id}</h1>
          <p>{order.status === "cancelled" ? t.cancelled : t.waiting}</p>
          <p>{t.notice}</p>
          <p>{t.payment}</p>
          <ul>
            {order.items.map((item) => (
              <li key={item.skuId}>
                {item.name} × {item.quantity} —{" "}
                {orderMoney(
                  item.unitMinor * item.quantity,
                  order.currency,
                  locale,
                )}
              </li>
            ))}
          </ul>
          <p>
            {t.subtotal}:{" "}
            {orderMoney(order.totals.itemsMinor, order.currency, locale)}
          </p>
          <p>{t.unknown}</p>
          {order.status !== "cancelled" && (
            <button disabled={pending} onClick={cancel}>
              {pending ? t.pending : t.cancel}
            </button>
          )}
        </section>
      )}
      <button onClick={() => setRefresh(refresh + 1)}>{t.refresh}</button>
      <a href={`/${locale}/members/orders`}>{t.back}</a>
    </>
  );
}
