'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
export function CreateDraftButton() {
  const [name, setName] = useState(''); const [summary, setSummary] = useState('');
  const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function create() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/content/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create', name, summary }) });
      const result = await response.json();
      if (!result.ok) { setError(result.error === 'FORBIDDEN' ? '管理員尚未初始化已發佈內容，請聯繫管理員。' : '新建草稿失敗，請稍後重試。'); return; }
      router.push(`/content/${result.data.id}`);
    } catch { setError('新建草稿失敗，請稍後重試。'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form className="panel draft-create" onSubmit={event => { event.preventDefault(); void create(); }}>
    <h2>新建草稿</h2><p>為這次調整取一個名稱，並簡述準備修改的內容。</p>
    <label>草稿名稱<input required maxLength={100} value={name} onChange={event => setName(event.target.value)} placeholder="例如：首頁產品介紹調整" disabled={busy} /></label>
    <label>建立摘要<input required maxLength={240} value={summary} onChange={event => setSummary(event.target.value)} placeholder="例如：整理首頁產品文案與圖片" disabled={busy} /></label>
    <button className="primary-button" disabled={busy || !name.trim() || !summary.trim()} type="submit">新建草稿</button>{error && <p role="alert">{error}</p>}
  </form>;
}
