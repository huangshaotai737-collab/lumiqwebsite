'use client';
import {useEffect,useRef,useState} from 'react';
import {NextIntlClientProvider} from 'next-intl';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
import type {Locale} from '@/lib/generated/platform/core';
import {acceptsCanvasMessage,canvasCandidates,visualPages,type CanvasField} from '@/lib/generated/platform/visual-editor';
import {createContentAdapter} from '@/lib/content/adapter';
import SiteContentProvider from '../SiteContentProvider';
import CartProvider from '@/components/cart/CartProvider';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import ScrollWords from '@/components/ScrollWords';
import VisualPage from './renderers';
import {trustedProductImages} from '@/lib/generated/platform/content-legacy-media';
import '@/app/[locale]/members/members.css';

export default function VisualCanvas({initial,locale,page,channel,adminOrigin,fields}:{initial:ContentSnapshot;locale:Locale;page:string;channel:string;adminOrigin:string;fields:CanvasField[]}){
 const [snapshot,setSnapshot]=useState(initial),[mode,setMode]=useState('edit');
 const [appliedRevision,setAppliedRevision]=useState(-1);
 const [outline,setOutline]=useState<{left:number;top:number;width:number;height:number}|null>(null);
 const [note,setNote]=useState('');const selected=useRef<HTMLElement|null>(null);
 const live=useRef({snapshot,mode});live.current={snapshot,mode};
 useEffect(()=>{
  if(appliedRevision>=0&&window.parent!==window)window.parent.postMessage({type:'lumiq.visual.applied',channel,revision:appliedRevision},adminOrigin);
 },[appliedRevision,channel,adminOrigin]);
 useEffect(()=>{
  const send=(type:string,extra:object={})=>window.parent.postMessage({type:`lumiq.visual.${type}`,channel,...extra},adminOrigin);
  if(window.parent===window)return;
  let revision=-1,lastHash='';let anchorObserver:MutationObserver|undefined,anchorTimeout:ReturnType<typeof setTimeout>|undefined;
  const anchor=(hash:unknown)=>{
   if(typeof hash!=='string'||!/^#[\w-]+$/.test(hash)||hash===lastHash)return;
   lastHash=hash;anchorObserver?.disconnect();clearTimeout(anchorTimeout);
   const scroll=()=>{const element=document.getElementById(hash.slice(1));if(element){element.scrollIntoView();anchorObserver?.disconnect();return true;}return false;};
   if(!scroll()){anchorObserver=new MutationObserver(scroll);anchorObserver.observe(document.body,{childList:true,subtree:true});anchorTimeout=setTimeout(()=>anchorObserver?.disconnect(),8000);}
  };
  const receive=(event:MessageEvent)=>{
   if(!acceptsCanvasMessage(event,adminOrigin,window.parent,channel))return;
   const data=event.data;
   if(data.type==='lumiq.visual.update'&&Number.isSafeInteger(data.revision)&&data.revision>=revision&&data.snapshot?.schemaVersion===1&&data.snapshot.messages?.[locale]&&data.snapshot.products&&data.snapshot.media&&Array.isArray(data.snapshot.plans)&&data.snapshot.settings){
    revision=data.revision;
    // Canonical contact copy is mirrored exactly as the existing save normalizer does.
    const value=structuredClone(data.snapshot) as ContentSnapshot;
    for(const language of ['en','zh-hant','ja'] as const)if(value.messages[language].Contact)(value.messages[language].Contact as Record<string,string>).intro=value.settings.contactText[language];
    for(const id of Object.keys(value.products) as (keyof typeof value.products)[])value.products[id].image=value.media[trustedProductImages[id].slotId].url;
    setSnapshot(value);setMode(data.mode==='browse'?'browse':'edit');setAppliedRevision(data.revision);send('status',{message:'临时修改已同步，尚未发布。'});
    anchor(data.hash);
   }
  };
  const choose=(target:HTMLElement)=>{
   for(let element:HTMLElement|null=target;element&&element!==document.body;element=element.parentElement){
    if(element.closest('[data-visual-ui]'))return null;
    const paths=canvasCandidates(fields,live.current.snapshot,locale,page,element instanceof HTMLImageElement?{src:element.currentSrc||element.src}:{text:element.textContent||'',textNodes:Array.from(element.childNodes).filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent||'')});
    if(paths.length)return {element,paths};
    if(element instanceof HTMLImageElement)return null;
   }
   return null;
  };
  const box=(element:HTMLElement|null)=>{
   selected.current=element;if(!element){setOutline(null);return;}
   const r=element.getBoundingClientRect();setOutline(previous=>previous&&previous.left===r.left&&previous.top===r.top&&previous.width===r.width&&previous.height===r.height?previous:{left:r.left,top:r.top,width:r.width,height:r.height});
  };
  const htmlTarget=(input:EventTarget|null)=>{let element=input instanceof Element?input:null;while(element&&!(element instanceof HTMLElement))element=element.parentElement;return element as HTMLElement|null;};
  const click=(event:MouseEvent)=>{
   const element=htmlTarget(event.target);if(!element||element.closest('[data-visual-ui]'))return;
   const target=element.closest<HTMLElement>('a,button,input,textarea,select')||element;
   if(live.current.mode==='edit'){
    event.preventDefault();event.stopImmediatePropagation();const found=choose(element);
    if(found){box(found.element);send('select',{paths:found.paths.slice(0,40)});}else{box(null);send('status',{message:'此处暂不支持点选编辑，可在下方“全部内容与更多设置”中查看。'});}
    return;
   }
   const anchor=target.closest('a');
   if((target instanceof HTMLButtonElement&&target.form&&target.type==='submit')||(target instanceof HTMLInputElement&&target.form&&['submit','image'].includes(target.type))){event.preventDefault();event.stopImmediatePropagation();setNote('这是编辑预览，不会提交报名、会员资料或订单。');return;}
   if(anchor){
    const url=new URL(anchor.href,location.href);
    if(url.origin===location.origin&&url.pathname===location.pathname&&url.hash)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(url.origin===location.origin){
     const route=url.pathname.replace(/^\/(en|zh-hant|ja)(?=\/|$)/,'')||'/';
     if((visualPages as readonly string[]).includes(route)){send('navigate',{page:route,hash:url.hash});return;}
    }
    setNote('预览只浏览官网页面，不执行登录、结账或外部跳转。');
   }
  };
  const submit=(event:Event)=>{event.preventDefault();event.stopImmediatePropagation();setNote('这是编辑预览，不会提交报名、会员资料或订单。');};
  let hoverTarget:HTMLElement|null=null,hoverSnapshot=live.current.snapshot;
  const move=(event:MouseEvent)=>{const target=htmlTarget(event.target);if(live.current.mode==='edit'&&target&&(target!==hoverTarget||hoverSnapshot!==live.current.snapshot)){hoverTarget=target;hoverSnapshot=live.current.snapshot;box(choose(target)?.element||null);}};
  const language=(event:Event)=>{const locale=(event as CustomEvent).detail;if(['en','zh-hant','ja'].includes(locale))send('navigate',{page,locale});};
  const scroll=()=>{if(selected.current)box(selected.current);};
  // Scope all write prevention to this authenticated iframe, never the public website.
  const fetchOriginal=window.fetch;
  const guardedFetch:typeof fetch=(input,init)=>{
   const method=(init?.method||(input instanceof Request?input.method:'GET')).toUpperCase();
   if(!['GET','HEAD'].includes(method)){setNote('预览不会提交业务数据。');return Promise.reject(new Error('Visual preview is read-only'));}
   return fetchOriginal(input,init);
  };
  window.fetch=guardedFetch;
  window.addEventListener('message',receive);window.addEventListener('lumiq:visual-language',language);document.addEventListener('click',click,true);document.addEventListener('submit',submit,true);document.addEventListener('mousemove',move,true);window.addEventListener('scroll',scroll,true);
  send('ready');
  return()=>{anchorObserver?.disconnect();clearTimeout(anchorTimeout);window.removeEventListener('lumiq:visual-language',language);window.removeEventListener('message',receive);document.removeEventListener('click',click,true);document.removeEventListener('submit',submit,true);document.removeEventListener('mousemove',move,true);window.removeEventListener('scroll',scroll,true);if(window.fetch===guardedFetch)window.fetch=fetchOriginal;};
 },[channel,adminOrigin,fields,locale,page]);
 return <NextIntlClientProvider locale={locale} messages={snapshot.messages[locale]} timeZone="UTC" onError={()=>{}} getMessageFallback={({key})=>`〔${key}：请检查文案格式〕`}>
  <SiteContentProvider snapshot={snapshot} preview visual><CartProvider>
   <div style={createContentAdapter(snapshot,locale,true).css()} className={`lumiq-root locale-${locale} flex min-h-screen flex-col`}>
    <div className="bg-layer"/><SiteHeader/><div className="flex-1"><VisualPage page={page}/></div><SiteFooter/><ScrollWords/>
   </div>
   {mode==='edit'&&outline&&<div data-visual-ui aria-hidden style={{position:'fixed',...outline,border:'2px solid #2463d4',borderRadius:4,pointerEvents:'none',zIndex:2147483646,background:'rgba(36,99,212,.06)'}}/>}
   {note&&<button data-visual-ui type="button" onClick={()=>setNote('')} style={{position:'fixed',bottom:16,left:16,right:16,zIndex:2147483647,padding:12,borderRadius:12,background:'#12213b',color:'#fff',font:'14px/1.5 sans-serif'}}>{note} ×</button>}
  </CartProvider></SiteContentProvider>
 </NextIntlClientProvider>;
}
