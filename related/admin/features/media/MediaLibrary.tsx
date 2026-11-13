'use client';
import { MediaPreview } from './MediaPreview';
import { LibraryUsageFilter } from './LibraryUsageFilter';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadForm, type UploadProfile } from './UploadForm';
import { mediaLibraryHref, type LibraryAsset, type MediaLibraryQuery } from './library-query';
export function MediaLibrary({ assets, profiles, total, page, pageSize, query }: { assets: LibraryAsset[]; profiles: UploadProfile[]; total: number; page: number; pageSize: number; query: MediaLibraryQuery }) {
  const router = useRouter(); const [busy, setBusy] = useState(''); const [message, setMessage] = useState('');
  async function archive(asset: LibraryAsset) {
    if (!window.confirm(`刪除「${asset.fileName}」？刪除後不能在新草稿中選用；官網及歷史版本已使用的圖片會保留。`)) return;
    const id = asset.id;
    if (busy) return; setBusy(id);
    try { const response = await (await fetch('/api/media/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: id }) })).json(); if (!response.ok) throw new Error(); setMessage('素材已刪除並歸檔。官網與歷史版本的圖片保留，新草稿不能再選用。'); router.refresh(); }
    catch { setMessage('刪除失敗，請稍後重試。'); } finally { setBusy(''); }
  }
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const usageLabel = (key: string) => profiles.find(profile => profile.key === key)?.label || key;
  return <div className="media-workspace"><UploadForm profiles={profiles} /><section className="panel"><h2>全部素材</h2><p>在整個素材庫中搜索文件名、素材 ID 或用途；用途篩選表示上傳約束，實際引用以草稿和發佈記錄爲準。服務端簽名讀取有效期 10 分鐘，預覽始終私有且不緩存。歸檔保留歷史原件與不可變副本。</p>
    <form action="/media" method="get" className="filters" key={JSON.stringify(query)}>
      <label>搜索文件名、ID 或用途<input name="q" maxLength={100} defaultValue={query.q} /></label>
      <LibraryUsageFilter profiles={profiles} initial={query.usage} />
      <label>素材狀態<select name="status" defaultValue={query.status}><option value="">全部狀態</option><option value="ready">可選用</option><option value="pending">待校驗</option><option value="archived">已刪除（歸檔）</option></select></label>
      <label>實際引用<select name="reference" defaultValue={query.reference}><option value="">全部引用狀態</option><option value="draft">草稿引用</option><option value="published">當前官網引用</option><option value="history">歷史發佈引用</option><option value="unreferenced">無草稿或發佈引用</option></select></label>
      <button type="submit">搜索與篩選</button> <Link href="/media">清除篩選</Link>
    </form>
    <p aria-live="polite">{`共 ${total} 條；第 ${page} 頁，每頁最多 ${pageSize} 條。`}</p><p role="status">{message}</p>
    {assets.length === 0 ? <p>{total === 0 ? '沒有符合條件的素材。可清除篩選或上傳新素材。' : '此頁沒有素材，結果可能已變動。'} {page > 1 && <Link href={mediaLibraryHref(query, 1)}>返回第一頁</Link>}</p> : <ul className="media-library">{assets.map(asset => <li key={asset.id}><MediaPreview src={asset.previewUrl} kind={asset.mime.startsWith('video/') ? 'video' : 'image'} title={usageLabel(asset.usageKey)} /><strong>{usageLabel(asset.usageKey)}</strong><p>{(asset.size / 1024).toFixed(1)} KB · {asset.status === 'ready' ? '可選用' : asset.status === 'archived' ? '已刪除（歸檔）' : '待校驗'}</p><details className="media-technical-details"><summary>檔名與素材編號</summary><p>{asset.fileName}</p><code>{asset.id}</code></details>
      <p>{asset.references.currentPublication ? '當前官網引用' : asset.references.releaseCount > 0 ? '僅歷史發佈引用' : '尚無發佈引用'} · 草稿引用 {asset.references.draftCount} 處 · 發佈引用 {asset.references.releaseCount} 處</p>
      <details><summary>查看實際引用</summary>
        {asset.references.draftCount === 0 ? <p>沒有當前草稿引用。</p> : <ul>{asset.references.drafts.map(ref => <li key={`${ref.id}:${ref.usageKey}`}><Link href={`/content/${ref.id}`}>草稿 {ref.id}</Link> · 版本 {ref.version} · {ref.status === 'submitted' ? '已提交審覈' : '編輯中'} · {usageLabel(ref.usageKey)}</li>)}</ul>}
        {asset.references.draftsTruncated && <p>僅展示最近 5 處草稿引用；以上草稿引用總數包含未展開記錄。</p>}
        {asset.references.releaseCount === 0 ? <p>沒有不可變發佈引用。</p> : <ul>{asset.references.releases.map(ref => <li key={`${ref.id}:${ref.usageKey}`}>發佈 <code>{ref.id}</code> · {ref.current ? '當前官網版本' : '歷史版本'} · {usageLabel(ref.usageKey)}</li>)}</ul>}
        {asset.references.releasesTruncated && <p>僅展示最近 5 處發佈引用（當前官網優先）；以上發佈引用總數包含未展開記錄。</p>}
      </details>
      {asset.status !== 'archived' && <button type="button" disabled={Boolean(busy)} className="danger-button" aria-label={`刪除素材 ${asset.fileName}`} onClick={() => archive(asset)}>刪除素材</button>}</li>)}</ul>}
    <nav aria-label="素材分頁">{page > 1 && <Link href={mediaLibraryHref(query, page - 1)}>上一頁</Link>} {page < lastPage && <Link href={mediaLibraryHref(query, page + 1)}>下一頁</Link>}</nav>
  </section></div>;
}
