'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FieldControl, replaceField } from './EditorFields';
import { fieldIssueTarget, matchesField, pageLabel, type EditorField } from './editor-labels';
import type { ContentDraft, ContentResult, FieldIssue } from './service';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
const groups = { messages: '三语文案', products: '产品', plans: '方案', media: '素材引用', settings: '系统设置' };
const errors = { CONFLICT: '草稿版本冲突。当前输入已保留，请下载冲突副本，再载入最新草稿后合并。', FORBIDDEN: '当前账号无操作权限。', UNAUTHENTICATED: '登录已过期，请重新登录。', INVALID_INPUT: '内容校验未通过，请修正下列字段。', UNAVAILABLE: '服务暂不可用，当前输入已保留。', RATE_LIMITED: '操作过于频繁，请稍后重试。', NOT_FOUND: '草稿不存在。' };
export function ContentEditor({ initial, fields, admin, mediaOptions, legacyMedia }: { initial: ContentDraft; fields: EditorField[]; admin: boolean; mediaOptions: { id: string; usageKey: string; fileName: string }[]; legacyMedia: Record<string, string> }) {
  const [snapshot, setSnapshot] = useState(initial.snapshot);
  // Freeze text-search matches while editing so an active field does not disappear mid-sentence.
  const [searchSnapshot, setSearchSnapshot] = useState(initial.snapshot);
  const [version, setVersion] = useState(initial.version);
  const [status, setStatus] = useState(initial.status);
  const [group, setGroup] = useState('messages');
  const [locale, setLocale] = useState('en');
  const [selectedPage, setSelectedPage] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [issues, setIssues] = useState<FieldIssue[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [conflict, setConflict] = useState<{ snapshot: ContentSnapshot; version: number; acceptEdits: boolean } | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ path: string } | null>(null);
  const busyRef = useRef(false);
  const availablePages = useMemo(() => [...new Set(fields.flatMap(field => field.pages))].sort(), [fields]);
  const filtered = useMemo(() => fields.filter(field => field.path.startsWith(`${group}.`) &&
    (group !== 'messages' || field.path.startsWith(`messages.${locale}.`)) &&
    (selectedPage === 'all' || field.pages.includes(selectedPage)) && matchesField(field, searchSnapshot, query) && !field.path.match(/\.price\.amount$/)).sort((left, right) => selectedPage === 'all' ? 0 : left.pages.length - right.pages.length), [fields, group, locale, query, selectedPage, searchSnapshot]);
  const invalidControlPaths = issues.map(issue => fieldIssueTarget(issue.path, snapshot).controlPath);
  const visible = filtered.slice(page * 40, (page + 1) * 40);
  useEffect(() => {
    if (focusTarget) document.getElementById(`field-${focusTarget.path}`)?.focus();
  }, [focusTarget]);
  function change(path: string, value: unknown) {
    if (busyRef.current) return;
    const next = replaceField(snapshot, path, value);
    setSnapshot(next); setDirty(true); setMessage('');
    if (conflict?.acceptEdits) setConflict({ ...conflict, snapshot: next });
  }
  function locate(path: string) {
    const issueTarget = fieldIssueTarget(path, snapshot);
    const target = fields.find(field => field.path === issueTarget.rowPath);
    if (!target) return;
    const parts = target.path.split('.'); setGroup(parts[0]); if (parts[0] === 'messages') setLocale(parts[1]);
    setSelectedPage('all'); setQuery(target.path); setPage(0); setFocusTarget({ path: issueTarget.controlPath });
  }
  async function operate(action: 'save' | 'submit' | 'publish') {
    if (busyRef.current) return; busyRef.current = true; setBusy(true); setMessage(''); setError(''); setIssues([]);
    try {
      const response = await fetch(`/api/content/${action === 'publish' ? 'publish' : 'drafts'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: initial.id, expectedVersion: version, ...(action === 'save' ? { snapshot } : action === 'submit' ? { action: 'submit' } : {}) }),
      });
      const result = await response.json() as ContentResult<{ version: number; releaseId?: string }>;
      if (!result.ok) {
        setError(errors[result.error as keyof typeof errors] || '操作失败，当前输入已保留。'); setIssues(result.issues || []);
        if (result.error === 'CONFLICT') setConflict({ snapshot: structuredClone(snapshot), version, acceptEdits: true }); return;
      }
      setConflict(null);
      if (action === 'publish') setMessage('已发布，官网内容将在 60 秒内生效。');
      else { setVersion(result.data.version); setDirty(false); setStatus(action === 'submit' ? 'submitted' : 'editing'); setMessage(action === 'submit' ? '已提交审核。' : '草稿已保存，不影响当前官网。'); }
    } catch { setError(errors.UNAVAILABLE); }
    finally { busyRef.current = false; setBusy(false); }
  }
  async function loadLatest() {
    if (busyRef.current) return; busyRef.current = true; setBusy(true);
    try {
      const response = await fetch(`/api/content/drafts?id=${initial.id}`, { cache: 'no-store' }); const result = await response.json();
      if (!result.ok) { setError('载入失败，当前输入已保留。'); return; }
      setConflict(previous => previous ? { ...previous, acceptEdits: false } : null);
      setSnapshot(result.data.snapshot); setSearchSnapshot(result.data.snapshot); setVersion(result.data.version); setStatus(result.data.status); setDirty(false); setError(''); setIssues([]); setMessage('已载入最新草稿。冲突副本仍可下载。');
    } catch { setError(errors.UNAVAILABLE); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ id: initial.id, expectedVersion: conflict?.version, snapshot: conflict?.snapshot }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `content-conflict-${initial.id}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <Link href="/content">返回内容工作区</Link><h1>编辑官网内容</h1>
    <p>版本 {version} · {status === 'submitted' ? '已提交审核' : '编辑中'}{dirty ? ' · 有未保存修改' : ''}</p>
    <p>正文按文本保存，保留原有格式变量。保存草稿不会改变官网。</p>
    <div className="content-toolbar"><button className="primary-button" disabled={busy} onClick={() => operate('save')}>保存草稿</button>
      <button disabled={busy || dirty} onClick={() => operate('submit')}>提交审核</button>
      {admin && <button disabled={busy || dirty} onClick={() => operate('publish')}>发布当前版本</button>}
    </div>
    <p role="status" aria-live="polite">{message}</p>
    {error && <section role="alert" className="notice"><p>{error}</p>{issues.length > 0 && <ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><button disabled={busy} onClick={() => locate(issue.path)} aria-label={`定位 ${issue.path}`}>{issue.path}</button>：{issue.message}</li>)}</ul>}</section>}
    {conflict && <div className="content-toolbar"><button onClick={download}>下载冲突副本</button><button disabled={busy} onClick={loadLatest}>载入最新草稿</button></div>}
    <section className="panel" aria-label="内容字段" aria-busy={busy}>
      <fieldset className="content-fieldset" aria-label="内容编辑控件" disabled={busy}>
      <div className="content-filters"><label>页面范围<select value={selectedPage} onChange={event => { setSearchSnapshot(snapshot); setSelectedPage(event.target.value); setPage(0); }}><option value="all">全部页面</option>{availablePages.map(value => <option key={value} value={value}>{pageLabel(value)}</option>)}</select></label><label>字段分组<select value={group} onChange={event => { setSearchSnapshot(snapshot); setGroup(event.target.value); setPage(0); }}>{Object.entries(groups).filter(([key]) => admin || key !== 'settings').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {group === 'messages' && <label>文案语言<select value={locale} onChange={event => { setSearchSnapshot(snapshot); setLocale(event.target.value); setPage(0); }}><option value="en">英文</option><option value="zh-hant">繁体中文</option><option value="ja">日文</option></select></label>}
      <label>搜索字段<input placeholder="搜索当前文案、中文名称或字段路径" value={query} onChange={event => { setSearchSnapshot(snapshot); setQuery(event.target.value); setPage(0); }} /></label></div>
      <p>共 {filtered.length} 个字段，每页最多显示 40 项。</p>
      {visible.map(field => <FieldControl key={`${field.path}:${version}`} field={field} snapshot={snapshot} selectedPage={selectedPage} mediaOptions={mediaOptions} legacyMedia={legacyMedia} change={change} invalidControlPaths={invalidControlPaths} />)}
      <div className="content-toolbar"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>上一页字段</button><span>第 {page + 1} 页</span><button disabled={(page + 1) * 40 >= filtered.length} onClick={() => setPage(value => value + 1)}>下一页字段</button></div>
      </fieldset>
    </section>
  </>;
}
