'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadForm, type UploadProfile } from './UploadForm';
import { mediaLibraryHref, type LibraryAsset, type MediaLibraryQuery } from './library-query';
export function MediaLibrary({ assets, profiles, total, page, pageSize, query }: { assets: LibraryAsset[]; profiles: UploadProfile[]; total: number; page: number; pageSize: number; query: MediaLibraryQuery }) {
  const router = useRouter(); const [busy, setBusy] = useState(''); const [message, setMessage] = useState('');
  async function archive(id: string) {
    if (busy) return; setBusy(id);
    try { const response = await (await fetch('/api/media/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: id }) })).json(); if (!response.ok) throw new Error(); setMessage('已归档。历史发布链接保留，可回滚历史版本；新草稿不能选用。'); router.refresh(); }
    catch { setMessage('归档失败，请稍后重试。'); } finally { setBusy(''); }
  }
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const usageLabel = (key: string) => profiles.find(profile => profile.key === key)?.label || key;
  return <div className="media-workspace"><UploadForm profiles={profiles} /><section className="panel"><h2>全部素材</h2><p>在整个素材库中搜索文件名、素材 ID 或用途；用途筛选表示上传约束，实际引用以草稿和发布记录为准。服务端签名读取有效期 10 分钟，预览始终私有且不缓存。归档保留历史原件与不可变副本。</p>
    <form action="/media" method="get" className="filters" key={JSON.stringify(query)}>
      <label>搜索文件名、ID 或用途<input name="q" maxLength={100} defaultValue={query.q} /></label>
      <label>上传用途<select name="usage" defaultValue={query.usage}><option value="">全部用途</option>{profiles.map(profile => <option key={profile.key} value={profile.key}>{profile.label}</option>)}</select></label>
      <label>素材状态<select name="status" defaultValue={query.status}><option value="">全部状态</option><option value="ready">可选用</option><option value="pending">待校验</option><option value="archived">已归档</option></select></label>
      <label>实际引用<select name="reference" defaultValue={query.reference}><option value="">全部引用状态</option><option value="draft">草稿引用</option><option value="published">当前官网引用</option><option value="history">历史发布引用</option><option value="unreferenced">无草稿或发布引用</option></select></label>
      <button type="submit">搜索与筛选</button> <Link href="/media">清除筛选</Link>
    </form>
    <p aria-live="polite">{`共 ${total} 条；第 ${page} 页，每页最多 ${pageSize} 条。`}</p><p role="status">{message}</p>
    {assets.length === 0 ? <p>{total === 0 ? '没有符合条件的素材。可清除筛选或上传新素材。' : '此页没有素材，结果可能已变动。'} {page > 1 && <Link href={mediaLibraryHref(query, 1)}>返回第一页</Link>}</p> : <ul className="media-library">{assets.map(asset => <li key={asset.id}><strong>{asset.fileName}</strong><p>{usageLabel(asset.usageKey)} · {(asset.size / 1024).toFixed(1)} KB · {asset.status === 'ready' ? '可选用' : asset.status === 'archived' ? '已归档' : '待校验'}</p><code>{asset.id}</code>
      <p>{asset.references.currentPublication ? '当前官网引用' : asset.references.releaseCount > 0 ? '仅历史发布引用' : '尚无发布引用'} · 草稿引用 {asset.references.draftCount} 处 · 发布引用 {asset.references.releaseCount} 处</p>
      <details><summary>查看实际引用</summary>
        {asset.references.draftCount === 0 ? <p>没有当前草稿引用。</p> : <ul>{asset.references.drafts.map(ref => <li key={`${ref.id}:${ref.usageKey}`}><Link href={`/content/${ref.id}`}>草稿 {ref.id}</Link> · 版本 {ref.version} · {ref.status === 'submitted' ? '已提交审核' : '编辑中'} · {usageLabel(ref.usageKey)}</li>)}</ul>}
        {asset.references.draftsTruncated && <p>仅展示最近 5 处草稿引用；以上草稿引用总数包含未展开记录。</p>}
        {asset.references.releaseCount === 0 ? <p>没有不可变发布引用。</p> : <ul>{asset.references.releases.map(ref => <li key={`${ref.id}:${ref.usageKey}`}>发布 <code>{ref.id}</code> · {ref.current ? '当前官网版本' : '历史版本'} · {usageLabel(ref.usageKey)}</li>)}</ul>}
        {asset.references.releasesTruncated && <p>仅展示最近 5 处发布引用（当前官网优先）；以上发布引用总数包含未展开记录。</p>}
      </details>
      {asset.previewUrl && (asset.mime.startsWith('video/') ? <video controls preload="metadata" src={asset.previewUrl} /> : <Image unoptimized width={260} height={180} style={{ height: 'auto' }} src={asset.previewUrl} alt={asset.fileName} loading="lazy" />)}
      {asset.status !== 'archived' && <button type="button" disabled={Boolean(busy)} onClick={() => archive(asset.id)}>归档 {asset.fileName}</button>}</li>)}</ul>}
    <nav aria-label="素材分页">{page > 1 && <Link href={mediaLibraryHref(query, page - 1)}>上一页</Link>} {page < lastPage && <Link href={mediaLibraryHref(query, page + 1)}>下一页</Link>}</nav>
  </section></div>;
}
