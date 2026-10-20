'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
export type UploadProfile = { key: string; kind: string; profile: string; label: string; maxBytes: number; mimes: readonly string[]; reason: string | null; companions: string[]; constraints: string };
export function UploadForm({ profiles }: { profiles: UploadProfile[] }) {
  const router = useRouter(); const [key, setKey] = useState(profiles[0]?.key || ''); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const file = useRef<HTMLInputElement>(null);
  const profile = profiles.find(value => value.key === key)!;
  async function upload(event: React.FormEvent) {
    event.preventDefault(); const selected = file.current?.files?.[0]; if (!selected || busy) return;
    if (selected.size <= 0 || selected.size > profile.maxBytes || !profile.mimes.includes(selected.type)) { setMessage('文件为空、格式不支持或超出当前用途限制。'); return; }
    setBusy(true); setMessage('正在上传与校验，请保留此页面。');
    try {
      const created = await (await fetch('/api/media/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: selected.name, size: selected.size, mime: selected.type, profile: key }) })).json();
      if (!created.ok) throw new Error(created.error);
      const sent = await fetch(created.data.uploadUrl, { method: 'PUT', headers: { 'Content-Type': selected.type, 'x-upsert': 'false', 'cache-control': 'no-store' }, body: selected });
      if (!sent.ok) throw new Error('UPLOAD_FAILED');
      const completed = await (await fetch('/api/media/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assetId: created.data.assetId }) })).json();
      if (!completed.ok) throw new Error(completed.error);
      setMessage(`素材已校验：${completed.data.assetId}。可在草稿中选择，尚未公开。`); if (file.current) file.current.value = ''; router.refresh();
    } catch (error) { setMessage(error instanceof Error && error.message === 'INVALID_INPUT' ? '校验失败：实际文件类型、大小、比例或时长不符合用途限制。' : '上传暂不可用，请检查权限、存储和媒体探测运行环境后重试。'); }
    finally { setBusy(false); }
  }
  return <form className="panel media-upload" onSubmit={upload}><h2>上传新素材</h2><fieldset className="content-fieldset" disabled={busy}>
    <label>素材用途<select value={key} onChange={event => setKey(event.target.value)}>{profiles.map(value => <option key={value.key} value={value.key}>{value.label}</option>)}</select></label>
    <p>{profile.constraints}。当前上限 {(profile.maxBytes / 1024 / 1024).toFixed(1)} MB（应用与存储限制中的较小值）。</p>
    {profile.reason ? <p role="note">只读：{profile.reason}</p> : <><label>选择文件<input ref={file} type="file" accept={profile.mimes.join(',')} required /></label><button className="primary-button" type="submit">上传并校验</button></>}
    <p>{profile.companions.length ? `本用途需同时选入：${profile.companions.join("、")}。` : ""}开场、人物和影片的配套封面必须一起选入同一发布版本。布局与时间线由代码维护。</p></fieldset><p role="status" aria-live="polite">{message}</p></form>;
}
