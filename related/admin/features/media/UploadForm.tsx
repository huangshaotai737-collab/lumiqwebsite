'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { UploadProfile } from './upload-profiles';
import { UsagePicker } from './UsagePicker';
import { MediaPreview } from './MediaPreview';
export type { UploadProfile } from './upload-profiles';
export function UploadForm({ profiles, initialUsage = '', releaseId = null, canRemove = false }: { profiles: UploadProfile[]; initialUsage?: string; releaseId?: string | null; canRemove?: boolean }) {
  const router = useRouter(); const [key, setKey] = useState(initialUsage || profiles[0]?.key || ''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const file = useRef<HTMLInputElement>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  const [removing, setRemoving] = useState(false);
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
  async function removeImage() {
    setRemoving(true); setMessage('');
    try {
      const response = await (await fetch('/api/media/remove', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usageKey: key, expectedReleaseId: releaseId }) })).json();
      if (!response.ok) {
        setMessage(response.error === 'CONFLICT' ? '官網內容已更新。請重新整理，確認目前圖片後再刪除。' : response.error === 'FORBIDDEN' ? '只有管理員可以刪除官網素材。' : '刪除未完成，請稍後重試。');
        return;
      }
      setMessage('素材已從官網移除，發佈記錄已保存。官網頁面會自動更新，也可重新整理立即查看。');
      setPending(null); if (file.current) file.current.value = ''; router.refresh();
    } catch { setMessage('無法確認刪除結果，請重新整理查看目前狀態。'); }
    finally { setRemoving(false); confirmation.current?.close(); }
  }
  return <form className="panel media-upload" onSubmit={upload}><div className="media-section-heading"><div><span className="media-step">01 · 選擇素材位置</span><h2>網站素材替換</h2><p>選擇頁面並搜尋素材，確認預覽後上傳替換檔案。</p></div><span className="media-count-badge">{profiles.length} 個素材位置</span></div>
    <fieldset className="content-fieldset media-upload-layout" disabled={busy || removing}>
      <UsagePicker profiles={profiles} value={key} onChange={value => { setKey(value); setPending(null); setMessage(''); }} />
      <section className="media-selection-detail" aria-label="已選圖片與上傳設定">
        <div className="media-selection-caption"><span>{profile.previewSource}</span><span>{profile.group}</span></div>
        <MediaPreview key={profile.previewUrl} src={profile.previewUrl} emptyLabel={profile.hidden ? '此位置的圖片已從官網移除' : undefined} kind={profile.kind} title={profile.title} poster={profile.posterUrl || undefined} />
        <h3 aria-live="polite">{profile.title}</h3><p>{profile.description}</p>
        <p className="media-management-link"><Link href={`/media?usage=${encodeURIComponent(key)}&status=#uploaded-materials`}>管理此位置的已上傳素材</Link><small>可在下方清單刪除已上傳版本；官網目前圖片可透過下方「刪除此素材」移除。</small></p>
        <details className="media-technical-details"><summary>查看原始檔名與素材編號</summary><p>{profile.fileName}</p><code>{profile.key}</code></details>
        <div className="media-upload-next"><span className="media-step">02 · 上傳替換檔案</span>
          <p>{profile.constraints} · 上限 {(profile.maxBytes / 1024 / 1024).toFixed(1)} MB</p>
          {profile.reason ? <p role="note">此素材唯讀：{profile.reason}</p> : <><label>選擇新檔案<input key={key} ref={file} type="file" accept={profile.mimes.join(',')} required onChange={event => { const selected = event.target.files?.[0]; setPending(selected ? { url: URL.createObjectURL(selected), name: selected.name, kind: selected.type.startsWith('video/') ? 'video' : 'image' } : null); }} /></label>
            {pending && <div className="media-pending-preview"><strong>新素材預覽</strong><MediaPreview key={pending.url} src={pending.url} kind={pending.kind} title={pending.name} /><p>{pending.name}</p></div>}
            <button className="primary-button" type="submit" disabled={!pending}>{busy ? '正在上傳與校驗…' : '上傳並校驗'}</button></>}
          {profile.kind === 'image' && <><button className="danger-button media-remove-selected" type="button" disabled={!canRemove || !releaseId || !profile.published || profile.hidden} onClick={() => confirmation.current?.showModal()}>{profile.hidden ? '已從官網移除' : '刪除此素材'}</button><small>{canRemove ? '確認刪除後，官網對應位置的圖片也會一併移除。' : '只有管理員可以刪除官網素材。'}</small></>}
          <p>上傳後需在內容草稿中選用，經管理員發佈後才會更新官網。</p>
          {profile.companions.length > 0 && <p>需與「{profile.companions.join('、')}」一同選入發佈版本。</p>}
          <p role="status" aria-live="polite">{message}</p>
        </div>
      </section>
    </fieldset>
    <dialog ref={confirmation} className="media-removal-dialog" aria-labelledby="media-removal-title" aria-describedby="media-removal-warning" onCancel={event => { if (removing) event.preventDefault(); }}>
      <h2 id="media-removal-title">確認刪除此素材？</h2>
      <MediaPreview src={profile.previewUrl} kind="image" title={profile.title} />
      <strong>{profile.title}</strong><p>{profile.description}</p>
      <p id="media-removal-warning" className="media-removal-warning">刪除此素材後，官網對應位置的圖片也會一併移除。同一素材位置用於多個頁面時，也會一併更新。此操作確認後即會發佈，無需另行提交。</p>
      <p>原檔與歷史版本會保留，可透過內容草稿重新選用，或由發佈記錄回復。</p>
      <div className="media-removal-actions"><button type="button" autoFocus disabled={removing} onClick={() => confirmation.current?.close()}>取消</button><button type="button" className="danger-button" disabled={removing} onClick={removeImage}>{removing ? '正在刪除…' : '確認刪除'}</button></div>
    </dialog>
  </form>;
}
