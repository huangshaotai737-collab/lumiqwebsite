"use client";
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
        if (!cancelled) setMessage("备注读取失败，请重新打开详情。");
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
        setMessage("保存失败，请检查权限或稍后重试。");
        return;
      }
      setNote("");
      try {
        await read();
        setMessage("备注已保存。");
      } catch {
        setMessage("备注已提交，但重新读取失败。请重新打开详情。");
      }
    } catch {
      setMessage("网络连接失败，请重试。");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel" aria-label="会员详情">
      <h2>{customer.displayName || "未填写姓名"}</h2>
      <p>{customer.email}</p>
      <p>注册时间：{new Date(customer.createdAt).toLocaleString("zh-CN")}</p>
      <form onSubmit={save} className="content-field">
        <label htmlFor="customer-note">新增内部备注（最多2000字）</label>
        <textarea
          id="customer-note"
          maxLength={2000}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          required
        />
        <button className="primary-button" disabled={pending}>
          {pending ? "正在保存…" : "保存备注"}
        </button>
      </form>
      <p role="status">{message}</p>
      <h3>最近100条内部备注</h3>
      {notes === null ? (
        <p>备注尚未读取完成。</p>
      ) : notes.length ? (
        notes.map((item) => (
          <article key={item.id}>
            <p className="operations-note">{item.note}</p>
            <small>{new Date(item.createdAt).toLocaleString("zh-CN")}</small>
          </article>
        ))
      ) : (
        <p>暂无内部备注。</p>
      )}
      <button onClick={close}>关闭详情</button>
    </section>
  );
}
