'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
export function CreateDraftButton() {
  const router = useRouter(); const lock = useRef(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function create() {
    if (lock.current) return; lock.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/content/drafts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create' }) });
      const result = await response.json();
      if (!result.ok) { setError(result.error === 'FORBIDDEN' ? '管理員尚未初始化已發佈內容，請聯繫管理員。' : '新建草稿失敗，請稍後重試。'); return; }
      router.push(`/content/${result.data.id}`);
    } catch { setError('新建草稿失敗，請稍後重試。'); }
    finally { lock.current = false; setBusy(false); }
  }
  return <><button className="primary-button" disabled={busy} onClick={create}>新建草稿</button>{error && <p role="alert">{error}</p>}</>;
}
