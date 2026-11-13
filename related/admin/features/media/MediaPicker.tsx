'use client';
import { useRef, useState } from 'react';
import type { ApiResult } from '@/lib/generated/platform/core';
import type { MediaOptionPage, MediaOptionCursor } from './service';
import { MediaPreview } from './MediaPreview';
import { mediaPresentation } from './presentation';
import profiles from './profiles.json';
export function MediaPicker({ usageKey, assetId, controlProps, onChange, originalPreviewUrl = null, hidden = false }: {
  hidden?: boolean; usageKey: string; assetId: string | null; controlProps: { id: string; 'aria-invalid': boolean; 'aria-describedby': string }; onChange: (assetId: string | null) => void; originalPreviewUrl?: string | null;
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
      setMessage(`本頁 ${result.data.items.length} 項，僅顯示當前用途的可用素材。`);
    } catch { setMessage('素材查詢暫不可用，當前選擇已保留。'); }
    finally { busyRef.current = false; setBusy(false); }
  }
  const presentation = mediaPresentation(usageKey);
  const kind = profiles[usageKey as keyof typeof profiles].kind;
  const previewUrl = hidden ? null : assetId ? `/api/media/preview?assetId=${assetId}` : originalPreviewUrl;
  const selectedName = hidden ? '已從官網移除' : assetId ? page.items.find(option => option.id === assetId)?.fileName || '已選取的素材' : '使用原站素材';
  return <fieldset {...controlProps} tabIndex={-1} className="content-fieldset media-picker" disabled={busy} aria-busy={busy}>
    <legend>{presentation.title}</legend>
    <div className="media-picker-selected"><MediaPreview key={previewUrl} src={previewUrl} emptyLabel={hidden ? '此位置的圖片已從官網移除' : undefined} kind={kind} title={presentation.title} /><div><strong>{selectedName}</strong><p>{presentation.description}</p><small>選取素材後可查看預覽；保存草稿並由管理員發佈後，才會更新官網。</small>{assetId && <details className="media-technical-details"><summary>查看素材編號</summary><code>{assetId}</code></details>}</div></div>
    <div className="media-picker-choices" role="radiogroup" aria-label={`${presentation.title}的可選素材`}>
      <label className="media-usage-card" data-selected={!hidden && !assetId}><input type="radio" name={controlProps.id} value="" checked={!hidden && !assetId} onChange={() => onChange(null)} /><MediaPreview key={originalPreviewUrl} src={originalPreviewUrl} kind={kind} title="原站素材" thumbnail /><span className="media-usage-copy"><strong>使用原站素材</strong><span>{!hidden && !assetId ? '✓ 已選取' : '恢復原始素材'}</span></span></label>
      {!hidden && assetId && !page.items.some(option => option.id === assetId) && <label className="media-usage-card" data-selected="true"><input type="radio" name={controlProps.id} value={assetId} checked readOnly /><MediaPreview key={previewUrl} src={previewUrl} kind={kind} title="目前選取" thumbnail /><span className="media-usage-copy"><strong>目前選取</strong><span>✓ 已選取 · 不在本頁清單</span></span></label>}
      {page.items.map(option => <label className="media-usage-card" data-selected={!hidden && option.id === assetId} key={option.id}><input type="radio" name={controlProps.id} value={option.id} checked={!hidden && option.id === assetId} onChange={() => onChange(option.id)} /><MediaPreview src={`/api/media/preview?assetId=${option.id}`} kind={kind} title={option.fileName} thumbnail /><span className="media-usage-copy"><strong>{option.fileName}</strong><span>{!hidden && option.id === assetId ? '✓ 已選取' : '選用素材'}</span></span></label>)}
    </div>
    <label htmlFor={`${controlProps.id}-search`}>依檔名或素材編號搜尋</label><input id={`${controlProps.id}-search`} maxLength={100} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="content-toolbar"><button type="button" onClick={() => load('search')}>查找已上傳素材</button><button type="button" disabled={!previous.length} onClick={() => load('previous')}>上一頁素材</button><button type="button" disabled={!page.nextCursor} onClick={() => load('next')}>下一頁素材</button></div>
    <small aria-live="polite">{message}</small>
  </fieldset>;
}
