import {describe,it,expect} from 'vitest';
import seed from './initial-snapshot.json';
import {parseSnapshot} from './parse';
import {applyBrandRevision} from '@/lib/generated/platform/apply-brand-revision';
import {withBrandContent} from '@/lib/generated/platform/brand-content';
import {brandMediaDefaults} from '@/lib/generated/platform/brand-media';
import {createContentAdapter} from './adapter';

describe('November brand reply',()=>{
 it.each(['/assets/orb-ui-20261102/rewards.webp','/assets/orb-ui-20261103/reward-goals.png'])('reads published reward images without falling back to bundled content: %s',url=>{
   const s=withBrandContent(parseSnapshot(seed));
   s.media.asset_3dbef3e285441f46.url=url;
   const saved=parseSnapshot(s);
   expect(createContentAdapter(withBrandContent(saved),'en').slot('asset_3dbef3e285441f46').url).toBe(url);
 });
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
   expect(Object.values(brandMediaDefaults).filter(slot=>slot.url.startsWith('/assets/orb-ui-'))).toHaveLength(6);
   expect(s.media.asset_3dbef3e285441f46.url).toBe('/assets/orb-ui-20261103/reward-goals.png');
   const id=Object.keys(brandMediaDefaults)[0],original=s.media[id].url;
   const uuid='11111111-1111-4111-8111-111111111111';
   s.media[id]={...s.media[id],assetId:uuid,url:`/api/media/${uuid}`};
   const saved=parseSnapshot(s);
   expect(createContentAdapter(withBrandContent(saved),'en').url(original)).toBe(`/api/media/${uuid}`);
   expect(createContentAdapter(saved,'en',true).url(original)).toBe(`/api/content/preview-media/${uuid}`);
 });
 it('keeps the merged Ola scene editable and preserves both historical source slots',()=>{
   const original='/assets/ola-scenes-20261103/adult-senior-companion.webp';
   const s=withBrandContent(parseSnapshot(seed));
   const id=Object.keys(brandMediaDefaults).find(id=>brandMediaDefaults[id].url===original)!;
   expect(id).toBeTruthy();
   expect(createContentAdapter(s,'zh-hant').url(original)).toBe(original);
   for(const legacy of ['asset_4e5db752a9e31771','asset_9be4a1247ceac726'])expect(s.media[legacy]).toEqual(seed.media[legacy as keyof typeof seed.media]);
   const uuid='22222222-2222-4222-8222-222222222222';
   s.media[id]={...s.media[id],assetId:uuid,url:`/api/media/${uuid}`};
   const saved=parseSnapshot(s);
   expect(createContentAdapter(saved,'zh-hant').url(original)).toBe(`/api/media/${uuid}`);
   expect(createContentAdapter(saved,'zh-hant',true).url(original)).toBe(`/api/content/preview-media/${uuid}`);
 });
 it('does not permit arbitrary images or changed code-owned slot identity',()=>{
   const s=withBrandContent(parseSnapshot(seed)),id=Object.keys(brandMediaDefaults)[0];
   s.media[id].url='/assets/arbitrary.webp';
   expect(()=>parseSnapshot(s)).toThrow();
   s.media[id]={...brandMediaDefaults[id],profile:'wrong'};
   expect(()=>parseSnapshot(s)).toThrow();
 });
});
