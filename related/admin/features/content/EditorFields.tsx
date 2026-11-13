'use client';
import { MediaPicker } from '@/features/media/MediaPicker';
import type { ContentSnapshot, ProductPresentation } from '@/lib/generated/platform/content';
import { fieldContext, fieldLabel, fieldValue, type EditorField } from './editor-labels';
import {trustedProductImages} from '@/lib/generated/platform/content-legacy-media';
import { mediaPresentation } from '@/features/media/presentation';
export function replaceField(snapshot: ContentSnapshot, path: string, value: unknown): ContentSnapshot {
  const copy = structuredClone(snapshot);
  const keys = path.split('.');
  const parent = keys.slice(0, -1).reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], copy);
  (parent as Record<string, unknown>)[keys[keys.length - 1]] = value;
  return copy;
}
// Keep the DOM's entered text (including decimal intermediates/errors); snapshot stores valid numeric values.
function numericValue(text: string) { return text !== '' && Number.isFinite(Number(text)) ? Number(text) : text; }
export function FieldControl({ field, snapshot, change, invalidControlPaths, selectedPage, legacyMedia, websiteOrigin }: {
  field: EditorField; snapshot: ContentSnapshot; change: (path: string, value: unknown) => void; invalidControlPaths: readonly string[]; selectedPage: string; legacyMedia: Record<string, string>; websiteOrigin?: string | null;
}) {
  const value = fieldValue(snapshot, field.path);
  const controlProperties = (path: string) => ({ id: `field-${path}`, 'aria-invalid': invalidControlPaths.includes(path), 'aria-describedby': `context-${field.path} hint-${field.path}` });
  const properties = controlProperties(field.path);
  let control;
  if (field.path.endsWith('.price.kind')) {
    const pricePath = field.path.slice(0, -5);
    const price = fieldValue(snapshot, pricePath) as ProductPresentation['price'];
    control = <><select {...properties} value={price.kind} onChange={event => change(pricePath, event.target.value === 'usd' ? { kind: 'usd', amount: 0 } : { kind: 'pending' })}>
      <option value="pending">待確認</option><option value="usd">美元參考價</option>
    </select>{price.kind === 'usd' && <label>參考金額（美元）<input {...controlProperties(`${pricePath}.amount`)} aria-label="參考金額（美元）" inputMode="decimal" defaultValue={price.amount} onChange={event => change(pricePath, { kind: 'usd', amount: numericValue(event.target.value) })} /></label>}
    <small>僅用於展示，不影響訂單金額。</small></>;
  } else if (field.path.endsWith('.contentStatus')) {
    control = <select {...properties} value={String(value)} onChange={event => change(field.path, event.target.value)}><option value="pending_brand_confirmation">待品牌確認</option><option value="confirmed">已確認</option></select>;
  } else if (/^products\.[^.]+\.image$/.test(field.path)) {
    const {slotId}=trustedProductImages[field.path.split('.')[1]]; const slot=snapshot.media[slotId];
    control = <><MediaPicker usageKey={slotId} assetId={slot.assetId} controlProps={properties} originalPreviewUrl={websiteOrigin ? new URL(legacyMedia[slotId], websiteOrigin).href : null} onChange={assetId=>change(`media.${slotId}`,{...slot,assetId,url:assetId?`/api/media/${assetId}`:legacyMedia[slotId]})}/><small>產品圖片與對應素材統一管理，預覽和發佈使用同一圖片。</small></>;
  } else if (field.type === 'assetId') {
    const slotKey = field.path.split('.')[1]; const slot = snapshot.media[slotKey];
    control = <MediaPicker usageKey={slotKey} assetId={slot.assetId} controlProps={properties} originalPreviewUrl={websiteOrigin ? new URL(legacyMedia[slotKey], websiteOrigin).href : null} onChange={assetId => change(`media.${slotKey}`, { ...slot, assetId, url: assetId ? `/api/media/${assetId}` : legacyMedia[slotKey] })} />;
  } else if (field.type === 'boolean') {
    control = <input {...properties} type="checkbox" checked={Boolean(value)} onChange={event => change(field.path, event.target.checked)} />;
  } else if (field.type === 'number') {
    control = <input {...properties} inputMode="decimal" defaultValue={value == null ? '' : String(value)} onChange={event => change(field.path, numericValue(event.target.value))} />;
  } else {
    control = <textarea {...properties} readOnly={field.path.startsWith('media.') && field.path.endsWith('.url')} rows={field.maxLength && field.maxLength <= 120 ? 2 : 3} value={value == null ? '' : String(value)} onChange={event => change(field.path, field.type === 'assetId' && event.target.value === '' ? null : event.target.value)} />;
  }
  const mediaTitle = field.path.startsWith('media.') ? mediaPresentation(field.path.split('.')[1]).title : null;
  return <div className="content-field"><label htmlFor={properties.id}>{mediaTitle ? `${mediaTitle} · ${fieldLabel(field, snapshot)}` : fieldLabel(field, snapshot)}</label><small id={`context-${field.path}`}>{fieldContext(field, snapshot, selectedPage)}</small><code className="content-path">{field.path}</code>{control}<small id={`hint-${field.path}`}>{field.maxLength ? `最多 ${field.maxLength} 字符。` : ''}{field.icuSignature !== null ? '保留原有變量與格式標記。' : ''}{field.mediaPurpose ? `素材用途：${field.mediaPurpose}` : ''}</small></div>;
}
