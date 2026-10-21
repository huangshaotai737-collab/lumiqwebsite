// Generated from contracts/ by scripts/sync-platform-contracts.mjs. Do not edit.
/** Shared, dependency-free protocol. No draft values or credentials belong in URLs. */
export type CanvasField = {path:string;pages:string[];type:string;mediaPurpose?:string|null};
export const visualPages = ['/', '/products', '/products/ola', '/products/ola-go', '/products/tablet', '/products/print', '/products/nest', '/story', '/about', '/contact', '/plans', '/prelaunch', '/members', '/faq', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/child-safety'] as const;
export const visualChannel = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function previewOrigin(input:unknown):string|null {
 if(typeof input!=='string')return null;
 try{const u=new URL(input);return ['https:','http:'].includes(u.protocol)&&u.pathname==='/'&&!u.username&&!u.password&&!u.search&&!u.hash?u.origin:null;}catch{return null;}
}
export function acceptsCanvasMessage(event:{origin:string;source:unknown;data:unknown},origin:string,source:unknown,channel:string):boolean {
 const data=event.data;
 return Boolean(source)&&visualChannel.test(channel)&&event.origin===origin&&event.source===source&&Boolean(data)&&typeof data==='object'&&
  (data as {channel?:unknown}).channel===channel&&['ready','applied','update','select','navigate','status','focus'].some(type=>(data as {type?:unknown}).type===`lumiq.visual.${type}`);
}
export function canvasValue(snapshot:unknown,path:string):unknown {
 return path.split('.').reduce<unknown>((value,key)=>value&&typeof value==='object'&&Object.hasOwn(value,key)?(value as Record<string,unknown>)[key]:undefined,snapshot);
}
export function canvasFields<T extends CanvasField>(fields:readonly T[],locale:string,page:string):T[] {
 return fields.filter(field=>(!field.path.startsWith('messages.')||field.path.startsWith(`messages.${locale}.`))&&
  (!field.path.startsWith('settings.contactText.')||field.path.endsWith(`.${locale}`))&&
  field.pages.some(p=>p===page||p==='global/navigation'||p==='global/footer'));
}
export function normalizeCanvasText(value:string):string {
 return value.replace(/<\/?(?:strong|em|b|i|br|link)[^>]*>/g,' ').replace(/[。．]|(?<!\d)\.|\.(?!\d)/gu,' ').replace(/\s+/g,' ').trim();
}
function mediaPath(src:string):string {
 try{const url=new URL(src,'https://preview.invalid');return url.pathname==='/_next/image'?mediaPath(url.searchParams.get('url')||''):decodeURIComponent(url.pathname).replace('/api/content/preview-media/','/api/media/');}catch{return '';}
}
export function backgroundField(snapshot:unknown,field:CanvasField):boolean {
 if(!field.path.startsWith('media.'))return false;
 const slot=canvasValue(snapshot,field.path.split('.').slice(0,2).join('.')) as {kind?:string;profile?:string}|undefined;
 return slot?.profile==='background'||slot?.kind==='video';
}
/** Return all exact candidates. Ambiguous copy is never silently bound to a field. */
export function canvasCandidates(fields:readonly CanvasField[],snapshot:unknown,locale:string,page:string,target:{text?:string;src?:string}):string[] {
 const relevant=canvasFields(fields,locale,page).filter(field=>!backgroundField(snapshot,field));
 if(target.src){
  const src=mediaPath(target.src);
  return relevant.filter(field=>field.path.startsWith('media.')&&field.path.endsWith('.assetId')&&mediaPath(String(canvasValue(snapshot,field.path.replace(/\.assetId$/,'.url'))||''))===src).map(field=>field.path);
 }
 const text=normalizeCanvasText(target.text||'');
 if(!text)return [];
 return relevant.filter(field=>field.type==='string'&&!field.path.startsWith('media.')&&!field.path.endsWith('.image')&&typeof canvasValue(snapshot,field.path)==='string'&&normalizeCanvasText(String(canvasValue(snapshot,field.path)))===text).map(field=>field.path);
}
