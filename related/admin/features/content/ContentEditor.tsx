'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FieldControl, replaceField } from './EditorFields';
import { fieldIssueTarget, matchesField, pageLabel, type EditorField } from './editor-labels';
import type { ContentDraft, ContentResult, FieldIssue } from './service';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import {backgroundField,canvasFields,canvasValue,visualPages} from '@/lib/generated/platform/visual-editor';
import {editHistory,newHistory,redoHistory,undoHistory} from './editor-history';
import {fieldLabel,fieldContext} from './editor-labels';
import VisualPreview from './VisualPreview';
import VisualBackground from './VisualBackground';
const groups = { messages: '三语文案', products: '产品', plans: '方案', media: '素材引用', settings: '系统设置' };
const errors = { CONFLICT: '草稿版本冲突。当前输入已保留，请下载冲突副本，再载入最新草稿后合并。', FORBIDDEN: '当前账号无操作权限。', UNAUTHENTICATED: '登录已过期，请重新登录。', INVALID_INPUT: '内容校验未通过，请修正下列字段。', UNAVAILABLE: '服务暂不可用，当前输入已保留。', RATE_LIMITED: '操作过于频繁，请稍后重试。', NOT_FOUND: '草稿不存在。' };
export function ContentEditor({ initial, fields, admin, legacyMedia, websiteOrigin }: { initial: ContentDraft; fields: EditorField[]; admin: boolean; legacyMedia: Record<string, string>; websiteOrigin?: string | null }) {
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
  const [selection,setSelection]=useState<string[]>([]);
  const [history,setHistory]=useState(newHistory);
  const [epoch,setEpoch]=useState(0);
  const [allOpen,setAllOpen]=useState(false);
  const [backgroundsOpen,setBackgroundsOpen]=useState(false);
  const [previewHash,setPreviewHash]=useState('');
  const [previewDevice,setPreviewDevice]=useState<'desktop'|'tablet'|'mobile'>('desktop');
  const [previewMode,setPreviewMode]=useState<'edit'|'browse'>('edit');
  const saved=useRef(initial.snapshot);
  const busyRef = useRef(false);
  const selectionPanel=useRef<HTMLElement>(null);
  const availablePages = useMemo(() => [...new Set(fields.flatMap(field => field.pages))].sort(), [fields]);
  const filtered = useMemo(() => fields.filter(field => field.path.startsWith(`${group}.`) &&
    (group !== 'messages' || field.path.startsWith(`messages.${locale}.`)) &&
    (selectedPage === 'all' || field.pages.includes(selectedPage)) && matchesField(field, searchSnapshot, query) && !field.path.match(/\.price\.amount$/)).sort((left, right) => selectedPage === 'all' ? 0 : left.pages.length - right.pages.length), [fields, group, locale, query, selectedPage, searchSnapshot]);
  const invalidControlPaths = issues.map(issue => fieldIssueTarget(issue.path, snapshot).controlPath);
  const visible = filtered.slice(page * 40, (page + 1) * 40);
  useEffect(() => {
    if (focusTarget) document.getElementById(`field-${focusTarget.path}`)?.focus();
  }, [focusTarget]);
  useEffect(()=>{
    if(!selection.length)return;
    selectionPanel.current?.scrollIntoView({block:'nearest',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    if(selection.length===1)document.getElementById(`field-${selection[0]}`)?.focus({preventScroll:true});
  },[selection]);
  useEffect(()=>{
    if(!dirty)return;
    const leave=(event:BeforeUnloadEvent)=>{event.preventDefault();};
    const navigate=(event:MouseEvent)=>{
      const anchor=event.target instanceof Element?event.target.closest('a'):null;
      if(!anchor||anchor.target==='_blank'||event.defaultPrevented||event.metaKey||event.ctrlKey)return;
      const url=new URL(anchor.href,location.href);
      if(url.origin===location.origin&&url.pathname!==location.pathname&&!window.confirm('有尚未保存的修改，确定离开吗？')){event.preventDefault();event.stopImmediatePropagation();}
    };
    window.addEventListener('beforeunload',leave);document.addEventListener('click',navigate,true);
    return()=>{window.removeEventListener('beforeunload',leave);document.removeEventListener('click',navigate,true);};
  },[dirty]);
  function change(path: string, value: unknown) {
    if (busyRef.current) return;
    setHistory(previous=>editHistory(previous,path,canvasValue(snapshot,path),value));
    const next = replaceField(snapshot, path, value);
    setSnapshot(next); setDirty(JSON.stringify(next)!==JSON.stringify(saved.current)); setMessage('');
    if (conflict?.acceptEdits) setConflict({ ...conflict, snapshot: next });
  }
  function locate(path: string) {
    setAllOpen(true);setSelection([]);
    const issueTarget = fieldIssueTarget(path, snapshot);
    const target = fields.find(field => field.path === issueTarget.rowPath);
    if (!target) return;
    const parts = target.path.split('.'); setGroup(parts[0]); if (parts[0] === 'messages') setLocale(parts[1]);
    setSelectedPage('all'); setQuery(target.path); setPage(0); setFocusTarget({ path: issueTarget.controlPath });
  }
  function travel(direction:'undo'|'redo'){
    if(busyRef.current)return;
    const result=direction==='undo'?undoHistory(history):redoHistory(history);if(!result)return;
    const next=replaceField(snapshot,result.path,result.value);
    setHistory(result.history);setSnapshot(next);setDirty(JSON.stringify(next)!==JSON.stringify(saved.current));setEpoch(value=>value+1);setMessage('');
    if(conflict?.acceptEdits)setConflict({...conflict,snapshot:next});
  }
  function selectPaths(paths:string[]){setSelection(paths.filter(path=>fields.some(field=>field.path===path)));}
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
      else { saved.current=snapshot;setVersion(result.data.version); setDirty(false); setStatus(action === 'submit' ? 'submitted' : 'editing'); setMessage(action === 'submit' ? '已提交审核。' : '草稿已保存，不影响当前官网。'); }
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
      saved.current=result.data.snapshot;setHistory(newHistory());setEpoch(value=>value+1);
    } catch { setError(errors.UNAVAILABLE); }
    finally { busyRef.current = false; setBusy(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ id: initial.id, expectedVersion: conflict?.version, snapshot: conflict?.snapshot }, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `content-conflict-${initial.id}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <div className="visual-editor-heading"><div><Link href="/content">返回内容工作区</Link><h1>编辑官网内容</h1></div><span className="visual-draft-badge">{dirty?'有未保存修改':'草稿工作区'}</span></div>
    <p>版本 {version} · {status === 'submitted' ? '已提交审核' : '编辑中'}{dirty ? ' · 有未保存修改' : ''}</p>
    <p>点击预览中的文字或图片，在下方修改并即时查看。保存草稿不会改变官网。</p>
    <div className="content-toolbar"><button className="primary-button" disabled={busy} onClick={() => operate('save')}>保存草稿</button>
      <button disabled={busy||!history.past.length} onClick={()=>travel('undo')}>撤销</button><button disabled={busy||!history.future.length} onClick={()=>travel('redo')}>重做</button>
      <button disabled={busy || dirty} onClick={() => operate('submit')}>提交审核</button>
      {websiteOrigin ? <a href={`${websiteOrigin}/${locale}/preview/${initial.id}?page=${encodeURIComponent(selectedPage.startsWith('/') ? selectedPage : '/')}`} target="_blank" rel="noopener noreferrer">预览已保存草稿</a> : <span>官网预览地址尚未配置</span>}
      {admin && <button disabled={busy || dirty} onClick={() => operate('publish')}>发布当前版本</button>}
    </div>
    <p className="visual-save-explainer">临时预览 → 保存草稿 → 提交审核 → 管理员发布。新窗口“预览已保存草稿”仅显示已保存版本。</p>
    <p role="status" aria-live="polite">{message}</p>
    {error && <section role="alert" className="notice"><p>{error}</p>{issues.length > 0 && <ul>{issues.map((issue, index) => <li key={`${issue.path}-${index}`}><button disabled={busy} onClick={() => locate(issue.path)} aria-label={`定位 ${issue.path}`}>{issue.path}</button>：{issue.message}</li>)}</ul>}</section>}
    {conflict && <div className="content-toolbar"><button onClick={download}>下载冲突副本</button><button disabled={busy} onClick={loadLatest}>载入最新草稿</button></div>}
    <VisualPreview key={`${selectedPage}:${locale}`} draftId={initial.id} snapshot={snapshot} websiteOrigin={websiteOrigin} page={(visualPages as readonly string[]).includes(selectedPage)?selectedPage:'/'} locale={locale} hash={previewHash} busy={busy} device={previewDevice} mode={previewMode} onDevice={setPreviewDevice} onMode={setPreviewMode}
      onPage={(value,hash='')=>{setSelectedPage(value);setPreviewHash(hash);setPage(0);setSelection([]);setQuery('');setSearchSnapshot(snapshot);}}
      onLocale={value=>{setLocale(value);setSelection([]);setSearchSnapshot(snapshot);}}
      onSelect={selectPaths}/>
    <section ref={selectionPanel} className="visual-selection panel" aria-label="选中内容" aria-busy={busy}>
      <div className="visual-section-heading"><div><small>当前编辑</small><h2>{selection.length?'选中内容':'从网页中选择内容'}</h2></div>{selection.length>0&&<button type="button" onClick={()=>setSelection([])}>取消选择</button>}</div>
      {selection.length===0?<p>在上方点选标题、段落或图片，这里只展示对应的编辑项。背景、视频和全部字段可在下方展开。</p>:
        selection.length>1?<><p>此处有相同或共用文案，请选择要修改的项目。</p><div className="visual-candidates">{selection.map(path=>{const field=fields.find(f=>f.path===path)!;return <button key={path} disabled={busy} onClick={()=>setSelection([path])}><strong>{fieldLabel(field,snapshot)}</strong><span>{fieldContext(field,snapshot,selectedPage)}</span><small>{path}</small></button>;})}</div></>:
        (()=>{const field=fields.find(f=>f.path===selection[0])!;return <fieldset disabled={busy} className="content-fieldset"><FieldControl key={`${field.path}:${version}:${epoch}`} field={field} snapshot={snapshot} selectedPage={selectedPage} legacyMedia={legacyMedia} change={change} invalidControlPaths={invalidControlPaths}/>
          {field.pages.length>1&&<p className="visual-shared-note">共用内容：修改会同步用于 {field.pages.map(pageLabel).join('、')}。</p>}
          <button type="button" onClick={()=>{const path=field.type==='assetId'?field.path.split('.').slice(0,2).join('.'):field.path;change(path,canvasValue(saved.current,path));setEpoch(value=>value+1);}}>恢复已保存值</button></fieldset>;})()}
    </section>
    <details open={backgroundsOpen} onToggle={event=>setBackgroundsOpen(event.currentTarget.open)} className="visual-settings panel"><summary><span>背景与视频素材</span><small>主动进入后修改，避免在网页中误选</small></summary>
      {backgroundsOpen&&<div className="visual-backgrounds">{canvasFields(fields,locale,(visualPages as readonly string[]).includes(selectedPage)?selectedPage:'/').filter(field=>field.type==='assetId'&&backgroundField(snapshot,field)&&!selection.includes(field.path)).map(field=><fieldset key={`${field.path}:${version}:${epoch}`} disabled={busy} className="content-fieldset"><VisualBackground field={field} snapshot={snapshot} websiteOrigin={websiteOrigin} selectedPage={selectedPage} legacyMedia={legacyMedia} change={change} invalidControlPaths={invalidControlPaths}/></fieldset>)}</div>}
      <p>动画时序、滚动逻辑和页面结构由开发维护，此处仅替换已有用途的素材。</p>
    </details>
    <details open={allOpen} onToggle={event=>setAllOpen(event.currentTarget.open)} className="visual-all-fields panel"><summary><span>全部内容与更多设置</span><small>完整字段、搜索及校验定位仍然保留</small></summary>
    {allOpen&&<section className="panel" aria-label="内容字段" aria-busy={busy}>
      <fieldset className="content-fieldset" aria-label="内容编辑控件" disabled={busy}>
      <div className="content-filters"><label>页面范围<select aria-label="页面范围" value={selectedPage} onChange={event => { setSearchSnapshot(snapshot); setSelectedPage(event.target.value); setPage(0); }}><option value="all">全部页面</option>{availablePages.map(value => <option key={value} value={value}>{pageLabel(value)}</option>)}</select></label><label>字段分组<select aria-label="字段分组" value={group} onChange={event => { setSearchSnapshot(snapshot); setGroup(event.target.value); setPage(0); }}>{Object.entries(groups).filter(([key]) => admin || key !== 'settings').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      {group === 'messages' && <label>文案语言<select aria-label="文案语言" value={locale} onChange={event => { setSearchSnapshot(snapshot); setLocale(event.target.value); setPage(0); }}><option value="en">英文</option><option value="zh-hant">繁体中文</option><option value="ja">日文</option></select></label>}
      <label>搜索字段<input aria-label="搜索字段" placeholder="搜索当前文案、中文名称或字段路径" value={query} onChange={event => { setSearchSnapshot(snapshot); setQuery(event.target.value); setPage(0); }} /></label></div>
      <p>共 {filtered.length} 个字段，每页最多显示 40 项。</p>
      {visible.filter(field=>(selection.length!==1||field.path!==selection[0])&&!(backgroundsOpen&&field.type==='assetId'&&backgroundField(snapshot,field)&&canvasFields([field],locale,(visualPages as readonly string[]).includes(selectedPage)?selectedPage:'/').length)).map(field => <FieldControl key={`${field.path}:${version}:${epoch}`} field={field} snapshot={snapshot} selectedPage={selectedPage} legacyMedia={legacyMedia} change={change} invalidControlPaths={invalidControlPaths} />)}
      <div className="content-toolbar"><button disabled={page === 0} onClick={() => setPage(value => value - 1)}>上一页字段</button><span>第 {page + 1} 页</span><button disabled={(page + 1) * 40 >= filtered.length} onClick={() => setPage(value => value + 1)}>下一页字段</button></div>
      </fieldset>
    </section>}
    </details>
  </>;
}
