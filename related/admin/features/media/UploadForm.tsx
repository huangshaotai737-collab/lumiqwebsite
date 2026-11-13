'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UploadProfile } from './upload-profiles';
import { UsagePicker } from './UsagePicker';
import { MediaPreview } from './MediaPreview';
export type { UploadProfile } from './upload-profiles';
export function UploadForm({ profiles }: { profiles: UploadProfile[] }) {
  const router = useRouter(); const [key, setKey] = useState(profiles[0]?.key || ''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const file = useRef<HTMLInputElement>(null);
  const profile = profiles.find(value => value.key === key)!;
  const [pending, setPending] = useState<{ url: string; name: string; kind: string } | null>(null);
  useEffect(() => () => { if (pending) URL.revokeObjectURL(pending.url); }, [pending]);
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
      setMessage(`素材已校驗：${completed.data.assetId}。可在草稿中選擇，尚未公開。`); if (file.current) file.current.value = ''; setPending(null); router.refresh();
    } catch (error) { setMessage(error instanceof Error && error.message === 'INVALID_INPUT' ? '校驗失敗：實際文件類型、大小、比例或時長不符合用途限制。' : '上傳暫不可用，請檢查權限、存儲和媒體探測運行環境後重試。'); }
    finally { setBusy(false); }
  }
  return <form className="panel media-upload" onSubmit={upload}><div className="media-section-heading"><div><span className="media-step">01 · 找到要更換的圖片</span><h2>看圖選擇，不必記住檔名</h2><p>依頁面、畫面內容或產品名稱搜尋，點選縮圖即可預覽。</p></div><span className="media-count-badge">{profiles.length} 個素材位置</span></div>
    <fieldset className="content-fieldset media-upload-layout" disabled={busy}>
      <UsagePicker profiles={profiles} value={key} onChange={value => { setKey(value); setPending(null); setMessage(''); }} />
      <section className="media-selection-detail" aria-label="已選圖片與上傳設定">
        <div className="media-selection-caption"><span>{profile.previewSource}</span><span>{profile.group}</span></div>
        <MediaPreview key={profile.previewUrl} src={profile.previewUrl} kind={profile.kind} title={profile.title} poster={profile.posterUrl || undefined} />
        <h3 aria-live="polite">{profile.title}</h3><p>{profile.description}</p>
        <details className="media-technical-details"><summary>查看原始檔名與素材編號</summary><p>{profile.fileName}</p><code>{profile.key}</code></details>
        <div className="media-upload-next"><span className="media-step">02 · 上傳這個位置的新素材</span>
          <p>{profile.constraints} · 上限 {(profile.maxBytes / 1024 / 1024).toFixed(1)} MB</p>
          {profile.reason ? <p role="note">此素材唯讀：{profile.reason}</p> : <><label>選擇新檔案<input key={key} ref={file} type="file" accept={profile.mimes.join(',')} required onChange={event => { const selected = event.target.files?.[0]; setPending(selected ? { url: URL.createObjectURL(selected), name: selected.name, kind: selected.type.startsWith('video/') ? 'video' : 'image' } : null); }} /></label>
            {pending && <div className="media-pending-preview"><strong>準備上傳的新素材</strong><MediaPreview key={pending.url} src={pending.url} kind={pending.kind} title={pending.name} /><p>{pending.name}</p></div>}
            <button className="primary-button" type="submit" disabled={!pending}>{busy ? '正在上傳與校驗…' : '上傳並校驗'}</button></>}
          <p>上傳後需在內容草稿中選用，確認並發布後才會更新官網。</p>
          {profile.companions.length > 0 && <p>需與「{profile.companions.join('、')}」一同選入發布版本。</p>}
          <p role="status" aria-live="polite">{message}</p>
        </div>
      </section>
    </fieldset>
  </form>;
}
