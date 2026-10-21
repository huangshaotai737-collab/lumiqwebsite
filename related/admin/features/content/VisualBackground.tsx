'use client';
import Image from 'next/image';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
import {FieldControl} from './EditorFields';
import type {EditorField} from './editor-labels';
export default function VisualBackground({field,snapshot,websiteOrigin,legacyMedia,selectedPage,change,invalidControlPaths}:{field:EditorField;snapshot:ContentSnapshot;websiteOrigin?:string|null;legacyMedia:Record<string,string>;selectedPage:string;change:(path:string,value:unknown)=>void;invalidControlPaths:string[]}){
 const slotId=field.path.split('.')[1],slot=snapshot.media[slotId];
 const url=slot.assetId?`/api/media/preview?assetId=${encodeURIComponent(slot.assetId)}`:websiteOrigin?`${websiteOrigin}${legacyMedia[slotId]}`:null;
 const name=(legacyMedia[slotId]||slotId).split('/').at(-1)?.replace(/\.[^.]+$/,'');
 return <div className="visual-background-card"><div className="visual-background-meta"><strong>{name}</strong><small>{slot.kind==='video'?'视频':slot.profile==='background'?'背景图片':'图片'} · {(legacyMedia[slotId]||'').includes('mobile')?'手机素材':'共用 / 电脑素材'}</small></div>
  {url&&(slot.kind==='video'?<video controls preload="metadata" src={url} aria-label="当前视频素材预览"/>:<Image src={url} alt={slot.alt||'当前背景素材'} width={480} height={180} unoptimized/>)}
  <FieldControl field={field} snapshot={snapshot} selectedPage={selectedPage} legacyMedia={legacyMedia} change={change} invalidControlPaths={invalidControlPaths}/>
 </div>;
}
