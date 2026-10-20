'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadForm, type UploadProfile } from './UploadForm';
type LibraryAsset = { id: string; fileName: string; usageKey: string; mime: string; size: number; status: string; previewUrl: string | null };
export function MediaLibrary({ assets, profiles }: { assets: LibraryAsset[]; profiles: UploadProfile[] }) {
  const router = useRouter(); const [busy, setBusy] = useState(''); const [message, setMessage] = useState('');
  async function archive(id: string) {
    if (busy) return; setBusy(id);
    try { const response = await (await fetch('/api/media/archive', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: id }) })).json(); if (!response.ok) throw new Error(); setMessage('已归档。历史发布链接保留，可回滚历史版本；新草稿不能选用。'); router.refresh(); }
    catch { setMessage('归档失败，请稍后重试。'); } finally { setBusy(''); }
  }
  return <><UploadForm profiles={profiles} /><section className="panel"><h2>最近素材</h2><p>服务端签名读取有效期 10 分钟，预览始终私有且不缓存。归档保留历史原件与不可变副本。</p><p role="status">{message}</p>
    <ul className="media-library">{assets.map(asset => <li key={asset.id}><strong>{asset.fileName}</strong><p>{profiles.find(profile => profile.key === asset.usageKey)?.label} · {(asset.size / 1024).toFixed(1)} KB · {asset.status === 'ready' ? '可选用' : asset.status === 'archived' ? '已归档' : '待校验'}</p><code>{asset.id}</code>
      {asset.previewUrl && (asset.mime.startsWith('video/') ? <video controls preload="metadata" src={asset.previewUrl} /> : <Image unoptimized width={260} height={180} style={{ height: 'auto' }} src={asset.previewUrl} alt={asset.fileName} loading="lazy" />)}
      {asset.status !== 'archived' && <button type="button" disabled={Boolean(busy)} onClick={() => archive(asset.id)}>归档 {asset.fileName}</button>}</li>)}</ul>
  </section></>;
}
