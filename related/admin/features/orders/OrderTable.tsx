"use client";
import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { Page } from "@/lib/generated/platform/core";
import type { Order } from "@/lib/generated/platform/commerce";
export function OrderTable({ initial }: { initial: Page<Order> }) {
  const [data, setData] = useState(initial),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [message, setMessage] = useState(""),
    [pending, setPending] = useState(false);
  const busy = useRef(false);
  async function load(page: number) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const r = await (
        await fetch(
          `/api/orders?${new URLSearchParams({ search, status, page: String(page), pageSize: "25" })}`,
          { cache: "no-store" },
        )
      ).json();
      if (r.ok) {
        setData(r.data);
        setMessage("");
      } else {
        setData({ ...initial, items: [], total: 0 });
        setMessage("訂單不可用或權限已失效。");
      }
    } catch {
      setMessage("讀取失敗，請重試。");
    }
    busy.current = false;
    setPending(false);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void load(1);
  }
  return (
    <section className="panel order-workspace">
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          <label>
            訂單或會員 ID
            <input
              value={search}
              maxLength={254}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label>
            狀態
            <select
              aria-label="狀態"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="pending_payment_setup">待支付開放</option>
              <option value="cancelled">已取消</option>
            </select>
          </label>
          <button>搜索</button>
        </fieldset>
      </form>
      <p role="status">{message}</p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>訂單</th>
              <th>狀態</th>
              <th>商品小計（最小單位）</th>
              <th>創建時間</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/orders/${o.id}`}>{o.id}</Link>
                </td>
                <td>{o.status === "cancelled" ? "已取消" : "待支付開放"}</td>
                <td>
                  {o.currency} {o.totals.itemsMinor}
                </td>
                <td>{o.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!data.total && <p>暫無訂單</p>}
      <nav className="pagination-controls" aria-label="訂單分頁">
        <button
          disabled={pending || data.page === 1}
          onClick={() => void load(data.page - 1)}
        >
          上一頁
        </button>
        <span>{data.page}</span>
        <button
          disabled={pending || data.page * data.pageSize >= data.total}
          onClick={() => void load(data.page + 1)}
        >
          下一頁
        </button>
      </nav>
    </section>
  );
}
