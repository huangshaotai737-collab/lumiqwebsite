"use client";
import {formatAdminDateTime} from '@/lib/date-time';
import { useState } from "react";
import type { Page } from "@/lib/generated/platform/core";
import type { WaitlistSummary } from "./service";
import type { OperationsQuery } from "./input";
const labels = { new: "新報名", contacted: "已聯繫", closed: "已關閉" };
function WaitlistRow({
  row,
  saved,
}: {
  row: WaitlistSummary;
  saved: () => void;
}) {
  const [status, setStatus] = useState(row.status);
  const [note, setNote] = useState(row.note);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/waitlist/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          status,
          note,
          expectedVersion: row.version,
        }),
      });
      const result = await response.json();
      if (response.ok && result.ok) {
        setMessage("已保存");
        saved();
      } else
        setMessage(
          result.error === "CONFLICT"
            ? "記錄已被其他人修改，請刷新列表後重試。"
            : result.error === "FORBIDDEN"
              ? "權限已失效，請重新登錄。"
              : "保存失敗，請重試。",
        );
    } catch {
      setMessage("網絡連接失敗，請重試。");
    } finally {
      setPending(false);
    }
  }
  return (
    <tr>
      <td data-label="郵箱">{row.email}</td>
      <td data-label="報名信息">
        來源：{row.source}
        <br />
        同意版本：{row.consentVersion}
        <br />
        {formatAdminDateTime(row.createdAt)}
      </td>
      <td data-label="狀態">
        <select
          disabled={pending}
          aria-label={`狀態 ${row.email}`}
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as WaitlistSummary["status"])
          }
        >
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td data-label="內部備註">
        <textarea
          disabled={pending}
          aria-label={`備註 ${row.email}`}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
        />
      </td>
      <td data-label="操作">
        <button className="primary-button" disabled={pending} onClick={save}>
          {pending ? "正在保存…" : "保存處理"}
        </button>
        <p role="status">{message}</p>
      </td>
    </tr>
  );
}
export function WaitlistTable({ initial }: { initial: Page<WaitlistSummary> }) {
  const [data, setData] = useState(initial);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OperationsQuery["status"]>("all");
  const [query, setQuery] = useState<OperationsQuery>({
    search: "",
    status: "all",
    page: 1,
    pageSize: 25,
  });
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  async function load(next: OperationsQuery, saved = false) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/waitlist/list?" +
          new URLSearchParams({
            ...next,
            page: String(next.page),
            pageSize: String(next.pageSize),
          }),
        { cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error();
      setData(result.data);
      setQuery(next);
      if (saved) setMessage("處理已保存。");
    } catch {
      setMessage(
        saved
          ? "處理已提交，但重新讀取失敗。請刷新列表。"
          : "讀取失敗，當前顯示上次成功結果。請重試。",
      );
    } finally {
      setPending(false);
    }
  }
  async function download() {
    setExporting(true);
    setMessage("");
    try {
      const response = await fetch(
        "/api/waitlist/export?" +
          new URLSearchParams({
            ...query,
            page: String(query.page),
            pageSize: String(query.pageSize),
          }),
        { method: "POST", cache: "no-store" },
      );
      if (!response.ok) {
        const result = await response.json();
        setMessage(
          result.error === "INVALID_INPUT"
            ? "導出範圍超過 10000 條，請收窄篩選後重試。"
            : result.error === "RATE_LIMITED"
              ? "每位員工每小時最多導出 5 次，請稍後重試。"
              : "導出失敗，請檢查權限或稍後重試。",
        );
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "lumiq-waitlist.csv";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("篩選結果已導出。");
    } catch {
      setMessage("導出失敗，請重試。");
    } finally {
      setExporting(false);
    }
  }
  return (
    <>
      <form
        className="content-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void load({ ...query, search, status, page: 1 });
        }}
      >
        <label>
          郵箱搜索
          <input
            aria-label="郵箱搜索"
            value={search}
            maxLength={254}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          處理狀態
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as OperationsQuery["status"])
            }
          >
            <option value="all">全部狀態</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" disabled={pending}>
          篩選
        </button>
      </form>
      <div className="content-toolbar operations-toolbar">
        <button disabled={pending || exporting} onClick={download}>
          {exporting ? "正在導出…" : "導出篩選結果，最多10000條"}
        </button>
        <button disabled={pending} onClick={() => load(query)}>
          刷新列表
        </button>
      </div>
      <p role="status">{message}</p>
      <p>
        共 {data.total} 條 · 第 {data.page} 頁 · 每頁 {data.pageSize} 條
      </p>
      {!data.items.length ? (
        <p>當前篩選或頁碼沒有記錄。</p>
      ) : (
        <div className="table-scroll team-list-scroll">
          <table className="team-list-table operations-table">
            <thead>
              <tr>
                <th>郵箱</th>
                <th>報名信息</th>
                <th>狀態</th>
                <th>內部備註</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <WaitlistRow
                  key={`${row.id}-${row.version}`}
                  row={row}
                  saved={() => void load(query, true)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="content-toolbar operations-toolbar">
        <button
          disabled={pending || data.page <= 1}
          onClick={() => load({ ...query, page: data.page - 1 })}
        >
          上一頁
        </button>
        <button
          disabled={pending || data.page * data.pageSize >= data.total}
          onClick={() => load({ ...query, page: data.page + 1 })}
        >
          下一頁
        </button>
      </div>
    </>
  );
}
