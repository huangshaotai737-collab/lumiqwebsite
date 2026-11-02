import {describe,it,expect} from 'vitest';
import seed from './initial-snapshot.json';
import {parseSnapshot} from './parse';
import {applyBrandRevision} from '@/lib/generated/platform/apply-brand-revision';
import {withBrandContent} from '@/lib/generated/platform/brand-content';
import {brandMediaDefaults} from '@/lib/generated/platform/brand-media';
import {createContentAdapter} from './adapter';

describe('November brand reply',()=>{
 it('uses approved prices and support inbox, preserving historical snapshots',()=>{
   const s=applyBrandRevision(parseSnapshot(seed)).snapshot;
   expect(s.products.tablet.price).toEqual({kind:'usd',amount:599});
   expect(s.products.ola.price).toEqual({kind:'usd',amount:899});
   expect(s.settings.supportEmail).toBe('support@lumiq.studio');
   expect((s.messages['zh-hant'].BrandUpdate as Record<string,unknown>).trial).toBe('當用戶創建帳號且開通設備後開始計算試用期。訂閱方案後始開始按月/按年付款，若用戶取消訂閱，則不會繼續自動扣款。');
   expect(parseSnapshot(seed)).toEqual(seed);
 });
 it('adds six editable images without rebasing the original media map',()=>{
   const s=withBrandContent(parseSnapshot(seed));
   expect(Object.keys(brandMediaDefaults)).toHaveLength(6);
   const id=Object.keys(brandMediaDefaults)[0],original=s.media[id].url;
   const uuid='11111111-1111-4111-8111-111111111111';
   s.media[id]={...s.media[id],assetId:uuid,url:`/api/media/${uuid}`};
   const saved=parseSnapshot(s);
   expect(createContentAdapter(withBrandContent(saved),'en').url(original)).toBe(`/api/media/${uuid}`);
   expect(createContentAdapter(saved,'en',true).url(original)).toBe(`/api/content/preview-media/${uuid}`);
 });
 it('does not permit arbitrary images or changed code-owned slot identity',()=>{
   const s=withBrandContent(parseSnapshot(seed)),id=Object.keys(brandMediaDefaults)[0];
   s.media[id].url='/assets/arbitrary.webp';
   expect(()=>parseSnapshot(s)).toThrow();
   s.media[id]={...brandMediaDefaults[id],profile:'wrong'};
   expect(()=>parseSnapshot(s)).toThrow();
 });
});
