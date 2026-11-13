'use client';
import {useEffect,useRef,useState} from 'react';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
import {acceptsCanvasMessage,visualPages} from '@/lib/generated/platform/visual-editor';
import {pageLabel} from './editor-labels';
type Props={draftId:string;snapshot:ContentSnapshot;websiteOrigin:string|null|undefined;page:string;locale:string;hash:string;busy:boolean;device:'desktop'|'tablet'|'mobile';mode:'edit'|'browse';onDevice:(device:'desktop'|'tablet'|'mobile')=>void;onMode:(mode:'edit'|'browse')=>void;onPage:(page:string,hash?:string)=>void;onLocale:(locale:string)=>void;onSelect:(paths:string[])=>void};
const devices={desktop:{width:1440,height:900,label:'電腦'},tablet:{width:820,height:1040,label:'平板'},mobile:{width:390,height:844,label:'手機'}};
type AppliedPreview={snapshot:ContentSnapshot;mode:string;hash:string;channel:string;revision:number};
export default function VisualPreview({draftId,snapshot,websiteOrigin,page,locale,hash,busy,device,mode,onDevice,onMode,onPage,onLocale,onSelect}:Props){
 const [channel,setChannel]=useState(draftId),[ready,setReady]=useState(false),[applied,setApplied]=useState<AppliedPreview|null>(null),[timedOut,setTimedOut]=useState(false);
 const [note,setNote]=useState('正在連接員工預覽…'),[available,setAvailable]=useState(900);
 const frame=useRef<HTMLIFrameElement>(null),stage=useRef<HTMLDivElement>(null),revision=useRef(0);
 const sent=useRef<AppliedPreview|null>(null);
 const effectiveMode=busy?'edit':mode;
 const connected=applied?.snapshot===snapshot&&applied.mode===effectiveMode&&applied.hash===hash&&applied.channel===channel;
 const selection=useRef(onSelect),navigation=useRef(onPage),language=useRef(onLocale);
 const reload=()=>{setChannel(crypto.randomUUID());setReady(false);setApplied(null);setTimedOut(false);setNote('正在連接員工預覽…');};
 useEffect(()=>{selection.current=onSelect;navigation.current=onPage;language.current=onLocale;},[onSelect,onPage,onLocale]);
 useEffect(()=>{
  const element=stage.current;if(!element)return;
  const observer=new ResizeObserver(([entry])=>setAvailable(Math.max(200,entry.contentRect.width-32)));observer.observe(element);return()=>observer.disconnect();
 },[]);
 useEffect(()=>{
  if(!channel||!websiteOrigin)return;
  const receive=(event:MessageEvent)=>{
   if(!acceptsCanvasMessage(event,websiteOrigin,frame.current?.contentWindow,channel))return;
   const message=event.data;
   if(message.type==='lumiq.visual.ready'){setReady(true);setTimedOut(false);setNote('正在同步預覽和操作模式…');}
   if(message.type==='lumiq.visual.applied'&&sent.current&&message.revision===sent.current.revision){setApplied(sent.current);setTimedOut(false);setNote('已連接 · 修改只在預覽中展示');}
   if(message.type==='lumiq.visual.select'&&Array.isArray(message.paths))selection.current(message.paths.filter((p:unknown)=>typeof p==='string').slice(0,40));
   if(message.type==='lumiq.visual.navigate'&&visualPages.some(p=>p===message.page)){if(['en','zh-hant','ja'].includes(message.locale))language.current(message.locale);navigation.current(message.page,typeof message.hash==='string'?message.hash:'');}
   if(message.type==='lumiq.visual.status'&&typeof message.message==='string')setNote(message.message.slice(0,200));
  };
  window.addEventListener('message',receive);const timeout=setTimeout(()=>setTimedOut(true),8000);
  return()=>{window.removeEventListener('message',receive);clearTimeout(timeout);};
 },[channel,websiteOrigin]);
 useEffect(()=>{
  if(!ready||!websiteOrigin||!channel)return;
  const pending={channel,revision:++revision.current,snapshot,mode:busy?'edit':mode,hash};sent.current=pending;
  const timeout=setTimeout(()=>frame.current?.contentWindow?.postMessage({type:'lumiq.visual.update',...pending},websiteOrigin),80);
  return()=>clearTimeout(timeout);
 },[snapshot,mode,ready,websiteOrigin,channel,busy,hash]);
 const size=devices[device],scale=Math.min(1,available/size.width);
 const url=websiteOrigin&&channel?`${websiteOrigin}/${locale}/preview/${draftId}?page=${encodeURIComponent(page)}&editor=${channel}`:'';
 const loginUrl=websiteOrigin?`${websiteOrigin}/${locale}/login?next=${encodeURIComponent(`/${locale}/preview/${draftId}?page=${encodeURIComponent(page)}`)}`:'';
 const savedPreviewUrl=websiteOrigin?`${websiteOrigin}/${locale}/preview/${draftId}?page=${encodeURIComponent(page)}${hash?`#${encodeURIComponent(hash.replace(/^#/,''))}`:''}`:'';
 return <section className="visual-browser" aria-label="官網實時預覽">
  <div className="visual-browser-toolbar">
   <div className="visual-context"><label>預覽頁面<select aria-label="預覽頁面" value={page} disabled={busy} onChange={e=>onPage(e.target.value)}>{visualPages.map(p=><option key={p} value={p}>{pageLabel(p)}</option>)}</select></label>
    <label>預覽語言<select aria-label="預覽語言" value={locale} disabled={busy} onChange={e=>onLocale(e.target.value)}><option value="en">英文</option><option value="zh-hant">繁體中文</option><option value="ja">日文</option></select></label></div>
   <div className="visual-device-tabs" aria-label="預覽設備">{Object.entries(devices).map(([key,value])=><button key={key} type="button" aria-pressed={device===key} onClick={()=>onDevice(key as keyof typeof devices)}>{value.label}</button>)}</div>
   <div className="visual-mode-tabs"><button type="button" disabled={busy} aria-pressed={mode==='edit'} onClick={()=>onMode('edit')}>點選編輯</button><button type="button" disabled={busy} aria-pressed={mode==='browse'} onClick={()=>onMode('browse')}>瀏覽交互</button></div>
   <button type="button" onClick={reload} disabled={busy}>重新載入</button><button type="button" onClick={()=>stage.current?.requestFullscreen?.().catch(()=>setNote('當前瀏覽器不支持全屏，可使用設備切換查看。'))}>全屏</button>
  </div>
  <div className="visual-address"><span aria-hidden>● ● ●</span><span>{pageLabel(page)} · {locale} · {size.width} × {size.height}</span><small>員工私有預覽</small></div>
  <div className="visual-stage" ref={stage}>
   {url?<div className="visual-frame-wrap" style={{width:size.width*scale,height:size.height*scale}}><iframe key={channel} ref={frame} title="官網內容實時預覽" src={url} width={size.width} height={size.height} style={{width:size.width,height:size.height,transform:`scale(${scale})`}} sandbox="allow-scripts allow-same-origin" referrerPolicy="same-origin"/></div>:<div className="visual-connection">{websiteOrigin?'正在準備預覽…':'尚未配置官網預覽地址。下方仍可編輯和保存原有內容。'}</div>}
   {(busy||(url&&!connected))&&<div className="visual-busy">{busy?'正在處理草稿，請稍候…':timedOut?<div className="visual-connection-card" role="status"><h3>預覽尚未連接，無需繼續等待</h3><p>官網與後臺分別登錄。如果瀏覽器攔截第三方 Cookie，已登錄也可能無法使用內嵌預覽。可以先保存草稿，再在獨立窗口查看。</p><div><a href={savedPreviewUrl} target="_blank" rel="noopener noreferrer">獨立窗口預覽已保存草稿</a><a href={loginUrl} target="_blank" rel="noopener noreferrer">打開官網員工登錄</a><button type="button" onClick={reload}>重新載入預覽</button></div><small>當前未保存的修改會保留。獨立窗口只展示已保存的版本；下方編輯、保存和發佈仍可正常使用。</small></div>:'正在連接官網預覽…'}</div>}
  </div>
  <div className="visual-browser-status"><span className={connected?'visual-connected':''}>{note}</span><small>{mode==='edit'?'點擊文字或圖片，在下方編輯':'可以瀏覽頁面和輪播，業務提交已關閉'}</small></div>
 </section>;
}
