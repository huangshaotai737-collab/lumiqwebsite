'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UploadProfile } from './upload-profiles';
import { UsagePicker } from './UsagePicker';
import { MediaPreview } from './MediaPreview';
export type { UploadProfile } from './upload-profiles';
export function UploadForm({ profiles, initialUsage = '' }: { profiles: UploadProfile[]; initialUsage?: string }) {
  const router = useRouter(); const [key, setKey] = useState(initialUsage || profiles[0]?.key || ''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const file = useRef<HTMLInputElement>(null);
  const profile = profiles.find(value => value.key === key)!;
  const [pending, setPending] = useState<{ url: string; name: string; kind: string } | null>(null);
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);
  async function upload(event: React.FormEvent) {
    event.preventDefault(); const selected = file.current?.files?.[0]; if (!selected || busy) return;
    if (selected.size <= 0 || selected.size > profile.maxBytes || !profile.mimes.includes(selected.type)) { setMessage('無法上傳：檔案為空、格式不支援或大小超過限制。'); return; }
    setBusy(true); setMessage('正在上傳並檢查檔案，請勿關閉此頁面。');
    try {
      const created = await (await fetch('/api/media/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: selected.name, size: selected.size, mime: selected.type, profile: key }) })).json();
      if (!created.ok) throw new Error(created.error);
      const sent = await fetch(created.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': selected.type, 'x-upsert': 'false', 'cache-control': 'no-store' }, body: selected });
      if (!sent.ok) throw new Error('UPLOAD_FAILED');
      const completed = await (await fetch('/api/media/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: created.data.assetId }) })).json();
      if (!completed.ok) throw new Error(completed.error);
      setMessage('素材已上傳並通過檢查。請在內容草稿中選用，經管理員發佈後更新官網。'); if (file.current) file.current.value = ''; setPending(null); router.refresh();
    } catch (error) { setMessage(error instanceof Error && error.message === 'INVALID_INPUT' ? '檔案檢查未通過：格式、大小、比例或時長不符合此位置的上傳要求。' : '上傳未完成，請稍後重試；若持續失敗，請聯絡系統管理員。'); }
    finally { setBusy(false); }
  }
  return <form className="panel media-upload" onSubmit={upload}><div className="media-section-heading"><div><span className="media-step">01 · 選擇素材位置</span><h2>網站素材替換</h2><p>選擇頁面並搜尋素材，確認預覽後上傳替換檔案。</p></div><span className="media-count-badge">{profiles.length} 個素材位置</span></div>
    <fieldset className="content-fieldset media-upload-layout" disabled={busy}>
      <UsagePicker profiles={profiles} value={key} onChange={value => { setKey(value); setPending(null); setMessage(''); }} />
      <section className="media-selection-detail" aria-label="已選圖片與上傳設定">
        <div className="media-selection-caption"><span>{profile.previewSource}</span><span>{profile.group}</span></div>
        <MediaPreview key={profile.previewUrl} src={profile.previewUrl} kind={profile.kind} title={profile.title} poster={profile.posterUrl || undefined} />
        <h3 aria-live="polite">{profile.title}</h3><p>{profile.description}</p>
        <p className="media-management-link"><Link href={`/media?usage=${encodeURIComponent(key)}&status=#uploaded-materials`}>管理此位置的已上傳素材</Link><small>可在下方清單刪除已上傳版本；官網原始素材可透過上傳新檔案替換。</small></p>
        <details className="media-technical-details"><summary>查看原始檔名與素材編號</summary><p>{profile.fileName}</p><code>{profile.key}</code></details>
        <div className="media-upload-next"><span className="media-step">02 · 上傳替換檔案</span>
          <p>{profile.constraints} · 上限 {(profile.maxBytes / 1024 / 1024).toFixed(1)} MB</p>
          {profile.reason ? <p role="note">此素材唯讀：{profile.reason}</p> : <><label>選擇新檔案<input key={key} ref={file} type="file" accept={profile.mimes.join(',')} required onChange={event => { const selected = event.target.files?.[0]; setPending(selected ? { url: URL.createObjectURL(selected), name: selected.name, kind: selected.type.startsWith('video/') ? 'video' : 'image' } : null); }} /></label>
            {pending && <div className="media-pending-preview"><strong>新素材預覽</strong><MediaPreview key={pending.url} src={pending.url} kind={pending.kind} title={pending.name} /><p>{pending.name}</p></div>}
            <button className="primary-button" type="submit" disabled={!pending}>{busy ? '正在上傳與校驗…' : '上傳並校驗'}</button></>}
          <p>上傳後需在內容草稿中選用，經管理員發佈後才會更新官網。</p>
          {profile.companions.length > 0 && <p>需與「{profile.companions.join('、')}」一同選入發佈版本。</p>}
          <p role="status" aria-live="polite">{message}</p>
        </div>
      </section>
    </fieldset>
  </form>;
}
