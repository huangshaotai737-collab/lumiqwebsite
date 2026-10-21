import {it,expect} from 'vitest';
import {visualMediaDependency} from '@/lib/content/visual-dependency';
import {createContentAdapter} from '@/lib/content/adapter';
import {initialSnapshot as seed} from '@/lib/content/initial-snapshot';
it('keeps visual media dependencies stable for copy edits while preserving public identity',()=>{
 const old=createContentAdapter(seed,'en',true),copy=structuredClone(seed);
 (copy.messages.en.HomeRefresh as Record<string,string>).heroBody='Edited text';
 const next=createContentAdapter(copy,'en',true),url='/assets/background-variants-20260911/version-5-tail-wave-20260914.mp4';
 expect(visualMediaDependency(old,true,url)).toBe(visualMediaDependency(next,true,url));
 expect(visualMediaDependency(old,false,url)).toBe(old);
 const id=Object.keys(copy.media).find(id=>copy.media[id].url===url)!;
 copy.media[id].url='/api/media/12345678-1234-4234-8234-123456789abc';
 expect(visualMediaDependency(createContentAdapter(copy,'en',true),true,url)).not.toBe(visualMediaDependency(old,true,url));
});
