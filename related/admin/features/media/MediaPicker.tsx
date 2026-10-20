'use client';
import { useRef, useState } from 'react';
import type { ApiResult } from '@/lib/generated/platform/core';
import type { MediaOptionPage, MediaOptionCursor } from './service';
export function MediaPicker({ usageKey, assetId, controlProps, onChange }: {
  usageKey: string; assetId: string | null; controlProps: { id: string; 'aria-invalid': boolean; 'aria-describedby': string }; onChange: (assetId: string | null) => void;
}) {
  const [page, setPage] = useState<MediaOptionPage>({ items: [], nextCursor: null });
  const [query, setQuery] = useState(''); const [appliedQuery, setAppliedQuery] = useState('');
  const [previous, setPrevious] = useState<(MediaOptionCursor | null)[]>([]); const [cursor, setCursor] = useState<MediaOptionCursor | null>(null);
  const [busy, setBusy] = useState(false); const busyRef = useRef(false); const [message, setMessage] = useState('');
  async function load(direction: 'search' | 'next' | 'previous') {
    if (busyRef.current) return;
    const next = direction === 'next' ? page.nextCursor : direction === 'previous' ? previous.at(-1) || null : null;
    const q = direction === 'search' ? query : appliedQuery;
    if (direction === 'next' && !next) return;
    busyRef.current = true; setBusy(true); setMessage('');
    try {
      const params = new URLSearchParams({ usageKey, q, ...(next ? { afterCreatedAt: next.createdAt, afterId: next.id } : {}) });
      const result = await (await fetch(`/api/media/options?${params}`, { cache: 'no-store' })).json() as ApiResult<MediaOptionPage>;
      if (!result.ok) throw new Error();
      setPage(result.data); setCursor(next); setAppliedQuery(q);
      setPrevious(direction === 'next' ? [...previous, cursor] : direction === 'previous' ? previous.slice(0, -1) : []);
      setMessage(`本页 ${result.data.items.length} 项，仅显示当前用途的可用素材。`);
    } catch { setMessage('素材查询暂不可用，当前选择已保留。'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  return <fieldset className="content-fieldset media-picker" disabled={busy} aria-busy={busy}>
    <select {...controlProps} value={assetId || ''} onChange={event => onChange(event.target.value || null)}>
      <option value="">使用原站素材</option>
      {assetId && !page.items.some(option => option.id === assetId) && <option value={assetId} disabled>当前素材 · {assetId}（不在本页或已归档）</option>}
      {page.items.map(option => <option key={option.id} value={option.id}>{option.fileName} · {option.id}</option>)}
    </select>
    <label htmlFor={`${controlProps.id}-search`}>按文件名或编号查找素材</label><input id={`${controlProps.id}-search`} maxLength={100} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="content-toolbar"><button type="button" onClick={() => load('search')}>查找素材</button><button type="button" disabled={!previous.length} onClick={() => load('previous')}>上一页素材</button><button type="button" disabled={!page.nextCursor} onClick={() => load('next')}>下一页素材</button></div>
    <small aria-live="polite">{message}</small>
  </fieldset>;
}
