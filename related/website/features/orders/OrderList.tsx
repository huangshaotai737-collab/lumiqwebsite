"use client";
import { useEffect, useState } from "react";
import type { Locale, Page } from "@/lib/generated/platform/core";
import type { Order } from "@/lib/generated/platform/commerce";
import { accountRevisionKey } from "@/features/account/session-event";
import { orderCopy } from "./copy";
export function OrderList({ locale }: { locale: Locale }) {
  const t = orderCopy[locale];
  const [data, setData] = useState<Page<Order> | null>(null),
    [message, setMessage] = useState(t.loading),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    let sequence = 0;
    const abort = new AbortController();
    async function load() {
      const current = ++sequence;
      setData(null);
      setMessage(t.loading);
      try {
        const response = await fetch(`/api/orders?page=${page}&pageSize=10`, {
          cache: "no-store",
          signal: abort.signal,
        });
        const result = await response.json();
        if (active && current === sequence) {
          setData(result.ok ? result.data : null);
          setMessage(result.ok ? "" : t.failed);
        }
      } catch {
        if (active && current === sequence) setMessage(t.failed);
      }
    }
    const hide = () => {
      sequence++;
      setData(null);
    };
    const show = () => {
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
  }, [page, refresh, t]);
  return (
    <section>
      <h2>{t.orders}</h2>
      <p role="status">{message}</p>
      {data && (
        <>
          <ul>
            {data.items.map((order) => (
              <li key={order.id}>
                <a href={`/${locale}/members/orders/${order.id}`}>{order.id}</a>{" "}
                — {order.status === "cancelled" ? t.cancelled : t.waiting}
              </li>
            ))}
          </ul>
          {!data.total && <p>{t.none}</p>}
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            ←
          </button>
          <span>{page}</span>
          <button
            disabled={page * 10 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            →
          </button>
        </>
      )}
      <button onClick={() => setRefresh(refresh + 1)}>{t.refresh}</button>
    </section>
  );
}
