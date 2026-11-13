"use client";
import {formatAdminDateTime} from '@/lib/date-time';
import { useEffect, useState } from "react";
import type { CustomerSummary, CustomerNote } from "./service";
export function CustomerDetail({
  customer,
  close,
}: {
  customer: CustomerSummary;
  close: () => void;
}) {
  const [notes, setNotes] = useState<CustomerNote[] | null>(null);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function read() {
    const response = await fetch(
      "/api/customers/notes?userId=" + encodeURIComponent(customer.id),
      { cache: "no-store" },
    );
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error();
    setNotes(result.data);
  }
  useEffect(() => {
    let cancelled = false;
    fetch("/api/customers/notes?userId=" + encodeURIComponent(customer.id), {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error();
        if (!cancelled) setNotes(result.data);
      })
      .catch(() => {
        if (!cancelled) setMessage("備註讀取失敗，請重新打開詳情。");
      });
    return () => {
      cancelled = true;
    };
  }, [customer.id]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/customers/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: customer.id, note }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        setMessage("保存失敗，請檢查權限或稍後重試。");
        return;
      }
      setNote("");
      try {
        await read();
        setMessage("備註已保存。");
      } catch {
        setMessage("備註已提交，但重新讀取失敗。請重新打開詳情。");
      }
    } catch {
      setMessage("網絡連接失敗，請重試。");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel" aria-label="會員詳情">
      <h2>{customer.displayName || "未填寫姓名"}</h2>
      <p>{customer.email}</p>
      <p>註冊時間：{formatAdminDateTime(customer.createdAt)}</p>
      <form method="POST" onSubmit={save} className="content-field">
        <label htmlFor="customer-note">新增內部備註（最多2000字）</label>
        <textarea
          disabled={pending}
          id="customer-note"
          maxLength={2000}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          required
        />
        <button className="primary-button" disabled={pending}>
          {pending ? "正在保存…" : "保存備註"}
        </button>
      </form>
      <p role="status">{message}</p>
      <h3>最近100條內部備註</h3>
      {notes === null ? (
        <p>備註尚未讀取完成。</p>
      ) : notes.length ? (
        notes.map((item) => (
          <article key={item.id}>
            <p className="operations-note">{item.note}</p>
            <small>{formatAdminDateTime(item.createdAt)}</small>
          </article>
        ))
      ) : (
        <p>暫無內部備註。</p>
      )}
      <button className="secondary-button" onClick={close}>關閉詳情</button>
    </section>
  );
}
