'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
export function DeleteRecordButton({ kind, id, name, version, disabled = false }: { kind: 'draft' | 'release'; id: string; name: string; version?: number; disabled?: boolean }) {
  const router = useRouter();
  const confirmation = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const label = kind === 'draft' ? '草稿' : '記錄';
  async function remove() {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/content/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, id, expectedVersion: version }) });
      const result = await response.json();
      if (!result.ok) { setError(result.error === 'CONFLICT' ? '內容已變更，或此版本正由官網使用。請重新整理後確認。' : '刪除失敗，請確認管理員權限或稍後再試。'); return; }
      confirmation.current?.close(); router.refresh();
    } catch { setError('無法連線，請稍後再試。'); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" className="danger-button" disabled={disabled} onClick={() => { setError(''); confirmation.current?.showModal(); }}>刪除{label}</button>
    <dialog ref={confirmation} className="media-removal-dialog" aria-label={`確認刪除${label}`} onCancel={event => { if (busy) event.preventDefault(); }}>
      <h2>確認刪除{label}？</h2><p>{name}</p>
      <p className="media-removal-warning">{kind === 'draft' ? '刪除後，此草稿將從工作區移除，無法繼續編輯或發佈。' : '刪除後，此記錄將從列表移除，無法再透過此記錄回滾。'}目前官網內容不會改變，操作記錄仍會保留。</p>
      {error && <p role="alert">{error}</p>}
      <div className="media-removal-actions"><button type="button" autoFocus disabled={busy} onClick={() => confirmation.current?.close()}>取消</button><button type="button" className="danger-button" disabled={busy} onClick={remove}>{busy ? '正在刪除…' : '確認刪除'}</button></div>
    </dialog>
  </>;
}
