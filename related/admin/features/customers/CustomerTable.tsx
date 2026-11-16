"use client";
import {formatAdminDateTime} from '@/lib/date-time';
import { useState } from "react";
import type { Page } from "@/lib/generated/platform/core";
import type { CustomerSummary } from "./service";
import { CustomerDetail } from "./CustomerDetail";
export function CustomerTable({ initial }: { initial: Page<CustomerSummary> }) {
  const [data, setData] = useState(initial);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [selected, setSelected] = useState<CustomerSummary | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function load(page: number, term = appliedSearch) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/customers/list?" +
          new URLSearchParams({
            search: term,
            page: String(page),
            pageSize: "25",
          }),
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error();
      setData(result.data);
      setAppliedSearch(term);
    } catch {
      setMessage("會員讀取失敗，當前顯示上次成功結果。請重試。");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <form
        className="content-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void load(1, search);
        }}
      >
        <label>
          姓名或郵箱
          <input
            aria-label="姓名或郵箱"
            value={search}
            maxLength={254}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <button className="primary-button" disabled={pending}>
          搜索會員
        </button>
      </form>
      <p role="status">{message}</p>
      <p>
        共 {data.total} 位 · 第 {data.page} 頁
      </p>
      {data.items.length ? (
        <div className="table-scroll team-list-scroll">
          <table className="team-list-table">
            <thead>
              <tr>
                <th>郵箱</th>
                <th>姓名</th>
                <th>註冊時間</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((customer) => (
                <tr key={customer.id}>
                  <td data-label="郵箱">{customer.email}</td>
                  <td data-label="姓名">{customer.displayName || "未填寫"}</td>
                  <td data-label="註冊時間">
                    {formatAdminDateTime(customer.createdAt)}
                  </td>
                  <td data-label="操作">
                    <button
                      className="primary-button"
                      onClick={() => setSelected(customer)}
                    >
                      查看詳情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>當前篩選或頁碼沒有會員。</p>
      )}
      <div className="content-toolbar">
        <button
          disabled={pending || data.page <= 1}
          onClick={() => load(data.page - 1)}
        >
          上一頁
        </button>
        <button
          disabled={pending || data.page * data.pageSize >= data.total}
          onClick={() => load(data.page + 1)}
        >
          下一頁
        </button>
      </div>
      {selected && (
        <CustomerDetail
          key={selected.id}
          customer={selected}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
