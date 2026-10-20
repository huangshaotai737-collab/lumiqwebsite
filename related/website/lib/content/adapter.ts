import type {CSSProperties} from 'react';
import type {ContentSnapshot} from '@/lib/generated/platform/content';
import type {Locale} from '@/i18n/routing';
import slots from './media-map.json';
import cssSlots from './css-slots.json';
import {resolveMediaSlot} from './media';
const byUrl:Record<string,string>=slots;
export function previewMediaUrl(url:string,preview:boolean) {
  return preview ? url.replace(/^\/api\/media\//,'/api/content/preview-media/') : url;
}
export function createContentAdapter(snapshot:ContentSnapshot,locale:Locale,preview=false) {
  const url=(original:string)=>previewMediaUrl(byUrl[original] ? resolveMediaSlot(snapshot,byUrl[original]).url : original,preview);
  return {
    snapshot,locale,preview,url,
    slot:(id:string)=>({...resolveMediaSlot(snapshot,id),url:previewMediaUrl(resolveMediaSlot(snapshot,id).url,preview)}),
    text:(key:string)=>{
      const value=(snapshot.messages[locale].CmsStatic as Record<string,string>)[key];
      if(typeof value!=='string')throw Error(`Unknown static content: ${key}`);
      return value;
    },
    value:(path:string):string=>{
      const resolved=path.replace('{locale}',locale).split('.').reduce<unknown>((v,k)=>v && typeof v==='object' ? (v as Record<string,unknown>)[k] : undefined,snapshot);
      if(typeof resolved!=='string')throw Error(`Unknown display string: ${path}`);
      return resolved;
    },
    css:()=>Object.fromEntries(cssSlots.map(id=>[`--cms-${id}`,`url(${JSON.stringify(previewMediaUrl(snapshot.media[id].url,preview))})`])) as CSSProperties,
  };
}
