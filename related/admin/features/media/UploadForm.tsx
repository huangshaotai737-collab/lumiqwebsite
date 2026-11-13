'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
export type UploadProfile = { key: string; kind: string; profile: string; label: string; maxBytes: number; mimes: readonly string[]; reason: string | null; companions: string[]; constraints: string };
export function UploadForm({ profiles }: { profiles: UploadProfile[] }) {
  const router = useRouter(); const [key, setKey] = useState(profiles[0]?.key || ''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const file = useRef<HTMLInputElement>(null);
  const profile = profiles.find(value => value.key === key)!;
  async function upload(event: React.FormEvent) {
    event.preventDefault(); const selected = file.current?.files?.[0]; if (!selected || busy) return;
    if (selected.size <= 0 || selected.size > profile.maxBytes || !profile.mimes.includes(selected.type)) { setMessage('文件爲空、格式不支持或超出當前用途限制。'); return; }
    setBusy(true); setMessage('正在上傳與校驗，請保留此頁面。');
    try {
      const created = await (await fetch('/api/media/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: selected.name, size: selected.size, mime: selected.type, profile: key }) })).json();
      if (!created.ok) throw new Error(created.error);
      const sent = await fetch(created.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': selected.type, 'x-upsert': 'false', 'cache-control': 'no-store' }, body: selected });
      if (!sent.ok) throw new Error('UPLOAD_FAILED');
      const completed = await (await fetch('/api/media/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: created.data.assetId }) })).json();
      if (!completed.ok) throw new Error(completed.error);
      setMessage(`素材已校驗：${completed.data.assetId}。可在草稿中選擇，尚未公開。`); if (file.current) file.current.value = ''; router.refresh();
    } catch (error) { setMessage(error instanceof Error && error.message === 'INVALID_INPUT' ? '校驗失敗：實際文件類型、大小、比例或時長不符合用途限制。' : '上傳暫不可用，請檢查權限、存儲和媒體探測運行環境後重試。'); }
    finally { setBusy(false); }
  }
  return <form className="panel media-upload" onSubmit={upload}><h2>上傳新素材</h2><fieldset className="content-fieldset" disabled={busy}>
    <label>素材用途<select value={key} onChange={event => setKey(event.target.value)}>{profiles.map(value => <option key={value.key} value={value.key}>{value.label}</option>)}</select></label>
    <p>{profile.constraints}。當前上限 {(profile.maxBytes / 1024 / 1024).toFixed(1)} MB（應用與存儲限制中的較小值）。</p>
    {profile.reason ? <p role="note">只讀：{profile.reason}</p> : <><label>選擇文件<input ref={file} type="file" accept={profile.mimes.join(',')} required /></label><button className="primary-button" type="submit">上傳並校驗</button></>}
    <p>{profile.companions.length ? `本用途需同時選入：${profile.companions.join("、")}。` : ""}開場、人物和影片的配套封面必須一起選入同一發佈版本。佈局與時間線由代碼維護。</p></fieldset><p role="status" aria-live="polite">{message}</p></form>;
}
