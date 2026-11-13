'use client';
import { useState } from 'react';
import type { UploadProfile } from './UploadForm';
import { matchesMedia } from './presentation';
import { MediaPreview } from './MediaPreview';

export function UsagePicker({ profiles, value, onChange }: { profiles: UploadProfile[]; value: string; onChange: (key: string) => void }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const visible = profiles.filter(profile => matchesMedia(profile, query, group));
  return <section className="media-usage-browser" aria-label="選擇官網圖片位置">
    <div className="media-usage-search"><label>搜尋圖片位置<input type="search" value={query} maxLength={100} placeholder="例如：父女共讀、Ola Go、行事曆" onChange={event => setQuery(event.target.value)} /></label>
      <label>所在頁面或分類<select value={group} onChange={event => setGroup(event.target.value)}><option value="">全部位置</option>{[...new Set(profiles.map(profile => profile.group))].map(name => <option key={name}>{name}</option>)}</select></label></div>
    <p className="media-result-count" aria-live="polite">{visible.length} 個位置 · 點選縮圖查看大圖與上傳設定</p>
    <div className="media-usage-grid" role="radiogroup" aria-label="官網圖片位置">
      {visible.map(profile => <label className="media-usage-card" data-selected={profile.key === value} key={profile.key}>
        <input type="radio" name="upload-usage" value={profile.key} checked={profile.key === value} onChange={() => onChange(profile.key)} />
        <MediaPreview key={profile.previewUrl} src={profile.previewUrl} kind={profile.kind} title={profile.title} thumbnail poster={profile.posterUrl || undefined} />
        <span className="media-usage-copy"><small>{profile.group} · {profile.format}</small><strong>{profile.title}</strong><span>{profile.key === value ? '✓ 已選取' : '查看並選取'}</span></span>
      </label>)}
    </div>
    {visible.length === 0 && <div className="media-no-results"><p>沒有符合條件的圖片位置。</p><button type="button" onClick={() => { setQuery(''); setGroup(''); }}>清除搜尋與分類</button></div>}
  </section>;
}
