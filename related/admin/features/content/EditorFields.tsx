'use client';
import type { ContentSnapshot, ProductPresentation } from '@/lib/generated/platform/content';
import { fieldContext, fieldLabel, fieldValue, type EditorField } from './editor-labels';
export function replaceField(snapshot: ContentSnapshot, path: string, value: unknown): ContentSnapshot {
  const copy = structuredClone(snapshot);
  const keys = path.split('.');
  const parent = keys.slice(0, -1).reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], copy);
  (parent as Record<string, unknown>)[keys[keys.length - 1]] = value;
  return copy;
}
// Keep the DOM's entered text (including decimal intermediates/errors); snapshot stores valid numeric values.
function numericValue(text: string) { return text !== '' && Number.isFinite(Number(text)) ? Number(text) : text; }
export function FieldControl({ field, snapshot, change, invalidControlPaths, selectedPage, mediaOptions, legacyMedia }: {
  field: EditorField; snapshot: ContentSnapshot; change: (path: string, value: unknown) => void; invalidControlPaths: readonly string[]; selectedPage: string; mediaOptions: { id: string; usageKey: string; fileName: string }[]; legacyMedia: Record<string, string>;
}) {
  const value = fieldValue(snapshot, field.path);
  const controlProperties = (path: string) => ({ id: `field-${path}`, 'aria-invalid': invalidControlPaths.includes(path), 'aria-describedby': `context-${field.path} hint-${field.path}` });
  const properties = controlProperties(field.path);
  let control;
  if (field.path.endsWith('.price.kind')) {
    const pricePath = field.path.slice(0, -5);
    const price = fieldValue(snapshot, pricePath) as ProductPresentation['price'];
    control = <><select {...properties} value={price.kind} onChange={event => change(pricePath, event.target.value === 'usd' ? { kind: 'usd', amount: 0 } : { kind: 'pending' })}>
      <option value="pending">待确认</option><option value="usd">美元参考价</option>
    </select>{price.kind === 'usd' && <label>参考金额（美元）<input {...controlProperties(`${pricePath}.amount`)} aria-label="参考金额（美元）" inputMode="decimal" defaultValue={price.amount} onChange={event => change(pricePath, { kind: 'usd', amount: numericValue(event.target.value) })} /></label>}
    <small>仅用于展示，不影响订单金额。</small></>;
  } else if (field.path.endsWith('.contentStatus')) {
    control = <select {...properties} value={String(value)} onChange={event => change(field.path, event.target.value)}><option value="pending_brand_confirmation">待品牌确认</option><option value="confirmed">已确认</option></select>;
  } else if (field.type === 'assetId') {
    const slotKey = field.path.split('.')[1]; const slot = snapshot.media[slotKey];
    const available = mediaOptions.filter(option => option.usageKey === slotKey);
    control = <select {...properties} value={slot.assetId || ''} onChange={event => { const assetId = event.target.value || null; change(`media.${slotKey}`, { ...slot, assetId, url: assetId ? `/api/media/${assetId}` : legacyMedia[slotKey] }); }}>
      <option value="">使用原站素材</option>{slot.assetId && !available.some(option => option.id === slot.assetId) && <option value={slot.assetId} disabled>当前素材（已归档或不可选）</option>}{available.map(option => <option key={option.id} value={option.id}>{option.fileName} · {option.id}</option>)}
    </select>;
  } else if (field.type === 'boolean') {
    control = <input {...properties} type="checkbox" checked={Boolean(value)} onChange={event => change(field.path, event.target.checked)} />;
  } else if (field.type === 'number') {
    control = <input {...properties} inputMode="decimal" defaultValue={value == null ? '' : String(value)} onChange={event => change(field.path, numericValue(event.target.value))} />;
  } else {
    control = <textarea {...properties} readOnly={field.path.startsWith('media.') && field.path.endsWith('.url')} rows={field.maxLength && field.maxLength <= 120 ? 2 : 3} value={value == null ? '' : String(value)} onChange={event => change(field.path, field.type === 'assetId' && event.target.value === '' ? null : event.target.value)} />;
  }
  return <div className="content-field"><label htmlFor={properties.id}>{fieldLabel(field, snapshot)}</label><small id={`context-${field.path}`}>{fieldContext(field, snapshot, selectedPage)}</small><code className="content-path">{field.path}</code>{control}<small id={`hint-${field.path}`}>{field.maxLength ? `最多 ${field.maxLength} 字符。` : ''}{field.icuSignature !== null ? '保留原有变量与格式标记。' : ''}{field.mediaPurpose ? `素材用途：${field.mediaPurpose}` : ''}</small></div>;
}
