"use client";
import { useState } from "react";
import type { Page } from "@/lib/generated/platform/core";
import type { WaitlistSummary } from "./service";
import type { OperationsQuery } from "./input";
const labels = { new: "新报名", contacted: "已联系", closed: "已关闭" };
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
            ? "记录已被其他人修改，请刷新列表后重试。"
            : result.error === "FORBIDDEN"
              ? "权限已失效，请重新登录。"
              : "保存失败，请重试。",
        );
    } catch {
      setMessage("网络连接失败，请重试。");
    } finally {
      setPending(false);
    }
  }
  return (
    <tr>
      <td data-label="邮箱">{row.email}</td>
      <td data-label="报名信息">
        来源：{row.source}
        <br />
        同意版本：{row.consentVersion}
        <br />
        {new Date(row.createdAt).toLocaleString("zh-CN")}
      </td>
      <td data-label="状态">
        <select
          aria-label={`状态 ${row.email}`}
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
      <td data-label="内部备注">
        <textarea
          aria-label={`备注 ${row.email}`}
          maxLength={2000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
        />
      </td>
      <td data-label="操作">
        <button className="primary-button" disabled={pending} onClick={save}>
          {pending ? "正在保存…" : "保存处理"}
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
      if (saved) setMessage("处理已保存。");
    } catch {
      setMessage(
        saved
          ? "处理已提交，但重新读取失败。请刷新列表。"
          : "读取失败，当前显示上次成功结果。请重试。",
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
        { cache: "no-store" },
      );
      if (!response.ok) {
        const result = await response.json();
        setMessage(
          result.error === "INVALID_INPUT"
            ? "导出范围超过 10000 条，请收窄筛选后重试。"
            : result.error === "RATE_LIMITED"
              ? "每位员工每小时最多导出 5 次，请稍后重试。"
              : "导出失败，请检查权限或稍后重试。",
        );
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "lumiq-waitlist.csv";
      link.click();
      URL.revokeObjectURL(url);
      setMessage("筛选结果已导出。");
    } catch {
      setMessage("导出失败，请重试。");
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
          邮箱搜索
          <input
            aria-label="邮箱搜索"
            value={search}
            maxLength={254}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          处理状态
          <select
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as OperationsQuery["status"])
            }
          >
            <option value="all">全部状态</option>
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="primary-button" disabled={pending}>
          筛选
        </button>
      </form>
      <div className="content-toolbar">
        <button disabled={pending || exporting} onClick={download}>
          {exporting ? "正在导出…" : "导出筛选结果，最多10000条"}
        </button>
        <button disabled={pending} onClick={() => load(query)}>
          刷新列表
        </button>
      </div>
      <p role="status">{message}</p>
      <p>
        共 {data.total} 条 · 第 {data.page} 页 · 每页 {data.pageSize} 条
      </p>
      {!data.items.length ? (
        <p>当前筛选或页码没有记录。</p>
      ) : (
        <div className="table-scroll team-list-scroll">
          <table className="team-list-table operations-table">
            <thead>
              <tr>
                <th>邮箱</th>
                <th>报名信息</th>
                <th>状态</th>
                <th>内部备注</th>
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
      <div className="content-toolbar">
        <button
          disabled={pending || data.page <= 1}
          onClick={() => load({ ...query, page: data.page - 1 })}
        >
          上一页
        </button>
        <button
          disabled={pending || data.page * data.pageSize >= data.total}
          onClick={() => load({ ...query, page: data.page + 1 })}
        >
          下一页
        </button>
      </div>
    </>
  );
}
