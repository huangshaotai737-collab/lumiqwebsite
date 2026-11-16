'use client';
import { useState } from 'react';
import type { UploadProfile } from './upload-profiles';
import { mediaPages } from './page-categories';
export function LibraryUsageFilter({ profiles, initial }: { profiles: UploadProfile[]; initial: string }) {
  const [page, setPage] = useState(() => initial ? profiles.find(profile => profile.key === initial)!.pages[0] : '/');
  const [usage, setUsage] = useState(initial);
  return <><label>用途所在頁面<select value={page} onChange={event => { setPage(event.target.value); setUsage(''); }}>
    {mediaPages.filter(([key]) => profiles.some(profile => profile.pages.includes(key))).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
  </select></label><label>上傳用途<select name="usage" value={usage} onChange={event => setUsage(event.target.value)}><option value="">不限用途</option>
    {profiles.filter(profile => profile.pages.includes(page)).map(profile => <option key={profile.key} value={profile.key}>{profile.title}</option>)}
  </select></label></>;
}
