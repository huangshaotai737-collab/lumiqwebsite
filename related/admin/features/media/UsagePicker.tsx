'use client';
import { useState } from 'react';
import type { UploadProfile } from './UploadForm';
import { matchesMedia } from './presentation';
import { MediaPreview } from './MediaPreview';
import { mediaPages } from './page-categories';

export function UsagePicker({ profiles, value, onChange }: { profiles: UploadProfile[]; value: string; onChange: (key: string) => void }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(() => profiles.find(profile => profile.key === value)!.pages[0]);
  const visible = profiles.filter(profile => profile.pages.includes(page) && matchesMedia(profile, query, ''));
  function selectPage(next: string) {
    setPage(next); setQuery('');
    onChange(profiles.find(profile => profile.pages.includes(next))!.key);
  }
  return <section className="media-usage-browser" aria-label="選擇官網圖片位置">
    <div className="media-usage-search"><label>搜尋圖片位置<input type="search" value={query} maxLength={100} placeholder="例如：父女共讀、Ola Go、行事曆" onChange={event => setQuery(event.target.value)} /></label>
      <label>所在頁面<select value={page} onChange={event => selectPage(event.target.value)}>{mediaPages.filter(([key]) => profiles.some(profile => profile.pages.includes(key))).map(([key, label]) => <option key={key} value={key}>{label}（{profiles.filter(profile => profile.pages.includes(key)).length}）</option>)}</select></label></div>
    <p className="media-result-count" aria-live="polite">{visible.length} 個素材位置 · 選取後可查看預覽及上傳要求</p>
    <div className="media-usage-grid" role="radiogroup" aria-label="官網圖片位置">
      {visible.map(profile => <label className="media-usage-card" data-selected={profile.key === value} key={profile.key}>
        <input type="radio" name="upload-usage" value={profile.key} checked={profile.key === value} onChange={() => onChange(profile.key)} />
        <MediaPreview key={profile.previewUrl} src={profile.previewUrl} kind={profile.kind} title={profile.title} thumbnail poster={profile.posterUrl || undefined} />
        <span className="media-usage-copy"><small>{profile.group} · {profile.format}</small><strong>{profile.title}</strong><span>{profile.hidden ? '已從官網移除' : profile.key === value ? '✓ 已選取' : '選取素材位置'}</span></span>
      </label>)}
    </div>
    {visible.length === 0 && <div className="media-no-results"><p>沒有符合條件的圖片位置。</p><button type="button" onClick={() => { setQuery(''); }}>清除搜尋</button></div>}
  </section>;
}
