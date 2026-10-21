'use client';
import {useEffect,useRef,useState} from 'react';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
import {acceptsCanvasMessage,visualPages} from '@/lib/generated/platform/visual-editor';
import {pageLabel} from './editor-labels';
type Props={draftId:string;snapshot:ContentSnapshot;websiteOrigin:string|null|undefined;page:string;locale:string;hash:string;busy:boolean;device:'desktop'|'tablet'|'mobile';mode:'edit'|'browse';onDevice:(device:'desktop'|'tablet'|'mobile')=>void;onMode:(mode:'edit'|'browse')=>void;onPage:(page:string,hash?:string)=>void;onLocale:(locale:string)=>void;onSelect:(paths:string[])=>void};
const devices={desktop:{width:1440,height:900,label:'电脑'},tablet:{width:820,height:1040,label:'平板'},mobile:{width:390,height:844,label:'手机'}};
type AppliedPreview={snapshot:ContentSnapshot;mode:string;hash:string;channel:string;revision:number};
export default function VisualPreview({draftId,snapshot,websiteOrigin,page,locale,hash,busy,device,mode,onDevice,onMode,onPage,onLocale,onSelect}:Props){
 const [channel,setChannel]=useState(draftId),[ready,setReady]=useState(false),[applied,setApplied]=useState<AppliedPreview|null>(null),[timedOut,setTimedOut]=useState(false);
 const [note,setNote]=useState('正在连接员工预览…'),[available,setAvailable]=useState(900);
 const frame=useRef<HTMLIFrameElement>(null),stage=useRef<HTMLDivElement>(null),revision=useRef(0);
 const sent=useRef<AppliedPreview|null>(null);
 const effectiveMode=busy?'edit':mode;
 const connected=applied?.snapshot===snapshot&&applied.mode===effectiveMode&&applied.hash===hash&&applied.channel===channel;
 const selection=useRef(onSelect),navigation=useRef(onPage),language=useRef(onLocale);
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
   if(message.type==='lumiq.visual.ready'){setReady(true);setTimedOut(false);setNote('正在同步预览和操作模式…');}
   if(message.type==='lumiq.visual.applied'&&sent.current&&message.revision===sent.current.revision){setApplied(sent.current);setTimedOut(false);setNote('已连接 · 修改只在预览中展示');}
   if(message.type==='lumiq.visual.select'&&Array.isArray(message.paths))selection.current(message.paths.filter((p:unknown)=>typeof p==='string').slice(0,40));
   if(message.type==='lumiq.visual.navigate'&&visualPages.some(p=>p===message.page)){if(['en','zh-hant','ja'].includes(message.locale))language.current(message.locale);navigation.current(message.page,typeof message.hash==='string'?message.hash:'');}
   if(message.type==='lumiq.visual.status'&&typeof message.message==='string')setNote(message.message.slice(0,200));
  };
  window.addEventListener('message',receive);const timeout=setTimeout(()=>setTimedOut(true),12000);
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
 return <section className="visual-browser" aria-label="官网实时预览">
  <div className="visual-browser-toolbar">
   <div className="visual-context"><label>预览页面<select aria-label="预览页面" value={page} disabled={busy} onChange={e=>onPage(e.target.value)}>{visualPages.map(p=><option key={p} value={p}>{pageLabel(p)}</option>)}</select></label>
    <label>预览语言<select aria-label="预览语言" value={locale} disabled={busy} onChange={e=>onLocale(e.target.value)}><option value="en">英文</option><option value="zh-hant">繁体中文</option><option value="ja">日文</option></select></label></div>
   <div className="visual-device-tabs" aria-label="预览设备">{Object.entries(devices).map(([key,value])=><button key={key} type="button" aria-pressed={device===key} onClick={()=>onDevice(key as keyof typeof devices)}>{value.label}</button>)}</div>
   <div className="visual-mode-tabs"><button type="button" disabled={busy} aria-pressed={mode==='edit'} onClick={()=>onMode('edit')}>点选编辑</button><button type="button" disabled={busy} aria-pressed={mode==='browse'} onClick={()=>onMode('browse')}>浏览交互</button></div>
   <button type="button" onClick={()=>{setChannel(crypto.randomUUID());setReady(false);setApplied(null);setTimedOut(false);setNote('正在连接员工预览…');}} disabled={busy}>重新载入</button><button type="button" onClick={()=>stage.current?.requestFullscreen?.().catch(()=>setNote('当前浏览器不支持全屏，可使用设备切换查看。'))}>全屏</button>
  </div>
  <div className="visual-address"><span aria-hidden>● ● ●</span><span>{pageLabel(page)} · {locale} · {size.width} × {size.height}</span><small>员工私有预览</small></div>
  <div className="visual-stage" ref={stage}>
   {url?<div className="visual-frame-wrap" style={{width:size.width*scale,height:size.height*scale}}><iframe key={channel} ref={frame} title="官网内容实时预览" src={url} width={size.width} height={size.height} style={{width:size.width,height:size.height,transform:`scale(${scale})`}} sandbox="allow-scripts allow-same-origin" referrerPolicy="same-origin"/></div>:<div className="visual-connection">{websiteOrigin?'正在准备预览…':'尚未配置官网预览地址。下方仍可编辑和保存原有内容。'}</div>}
   {(busy||(url&&!connected))&&<div className="visual-busy">{busy?'正在处理草稿，请稍候…':'正在同步预览，请稍候…'}</div>}
  </div>
  <div className="visual-browser-status"><span className={connected?'visual-connected':''}>{note}</span><small>{mode==='edit'?'点击文字或图片，在下方编辑':'可以浏览页面和轮播，业务提交已关闭'}</small></div>
  {timedOut&&!connected&&websiteOrigin&&<div className="visual-login-help" role="status">预览尚未连接。请先在官网登录有效员工账号，再点击“重新载入”。<a href={`${websiteOrigin}/${locale}/login?next=${encodeURIComponent(`/${locale}/preview/${draftId}?page=${encodeURIComponent(page)}`)}`} target="_blank" rel="noopener noreferrer">打开官网员工登录</a><span>临时输入会保留。若已登录，请核对官网的 ADMIN_ORIGIN 配置。</span></div>}
 </section>;
}
