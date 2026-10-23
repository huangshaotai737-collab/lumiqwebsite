import {describe,it,expect} from 'vitest';
import {canvasCandidates, canvasFields, acceptsCanvasMessage, normalizeCanvasText, previewOrigin} from '@/lib/generated/platform/visual-editor';
import seed from './initial-snapshot.json';
describe('visual editor selection and trust boundary',()=>{
 const fields=[
  {path:'messages.en.Home.title',pages:['/'],type:'string'},
  {path:'messages.en.Other.title',pages:['/'],type:'string'},
  {path:'messages.ja.Home.title',pages:['/'],type:'string'},
  {path:'messages.en.Footer.title',pages:['global/footer'],type:'string'},
 ];
 const snapshot={...seed,messages:{...seed.messages,en:{Home:{title:'Hello world'},Other:{title:'Hello world'},Footer:{title:'Footer'}}}};
 it('keeps duplicate text as explicit candidates and filters other languages',()=>{
  expect(canvasCandidates(fields,snapshot,'en','/',{text:'Hello   world'})).toEqual(['messages.en.Home.title','messages.en.Other.title']);
  expect(canvasFields(fields,'en','/').map(f=>f.path)).toContain('messages.en.Footer.title');
 });
 it('normalizes rich tags and heading punctuation without evaluating HTML',()=>{
  expect(normalizeCanvasText('A <strong>quiet</strong> home.')).toBe('A quiet home');
 });
 it('selects a standalone title text node when its heading also contains a styled subtitle',()=>{
  const titleFields=[{path:'messages.en.Home.title',pages:['/'],type:'string'},{path:'messages.en.Other.title',pages:['/'],type:'string'}];
  const value={...snapshot,messages:{...snapshot.messages,en:{Home:{title:'同一個家，'},Other:{title:'各自的生活節奏。'}}}};
  expect(canvasCandidates(titleFields,value,'en','/',{text:'同一個家，各自的生活節奏',textNodes:['同一個家，']})).toEqual(['messages.en.Home.title']);
  expect(canvasCandidates(titleFields,value,'en','/',{text:'同一個家，各自的生活節奏',textNodes:['同一個家，','各自的生活節奏']})).toEqual(['messages.en.Home.title','messages.en.Other.title']);
 });
 it('keeps whole-field matches first and does not use arbitrary substring matches',()=>{
  expect(canvasCandidates(fields,snapshot,'en','/',{text:'Hello world',textNodes:['Hello']})).toEqual(['messages.en.Home.title','messages.en.Other.title']);
  expect(canvasCandidates(fields,snapshot,'en','/',{text:'A sentence containing Hello world',textNodes:['A sentence containing Hello world']})).toEqual([]);
 });
 it('matches optimized image references and excludes background/video slots',()=>{
  const names=Object.keys(seed.media); const id=names.find(k=>seed.media[k as keyof typeof seed.media].profile!=='background'&&seed.media[k as keyof typeof seed.media].kind==='image')!;
  const bg=names.find(k=>seed.media[k as keyof typeof seed.media].profile==='background')!;
  const media=[{path:`media.${id}.assetId`,pages:['/'],type:'assetId'},{path:`media.${bg}.assetId`,pages:['/'],type:'assetId'}];
  const url=seed.media[id as keyof typeof seed.media].url;
  expect(canvasCandidates(media,seed,'en','/',{src:`http://localhost/_next/image?url=${encodeURIComponent(url)}&w=640&q=75`})).toEqual([`media.${id}.assetId`]);
  expect(canvasCandidates(media,seed,'en','/',{src:seed.media[bg as keyof typeof seed.media].url})).toEqual([]);
 });
 it('requires exact origin, frame source, UUID channel and known message',()=>{
  const source={},channel='12345678-1234-4234-8234-123456789abc';
  const event={origin:'https://site.example',source,data:{type:'lumiq.visual.ready',channel}};
  expect(acceptsCanvasMessage(event,'https://site.example',source,channel)).toBe(true);
  for(const bad of [{...event,origin:'https://site.example.evil'}, {...event,source:{}}, {...event,data:{...event.data,channel:'other'}}, {...event,data:{...event.data,type:'publish'}}]) expect(acceptsCanvasMessage(bad,'https://site.example',source,channel)).toBe(false);
 });
 it('rejects origin paths, credentials and non-http schemes',()=>{
  expect(previewOrigin('https://admin.example')).toBe('https://admin.example');
  for(const value of ['https://admin.example/path','https://u:p@admin.example','javascript:alert(1)','https://admin.example/?x=1'])expect(previewOrigin(value)).toBeNull();
 });
});
