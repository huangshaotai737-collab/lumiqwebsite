import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/content/read',()=>({readPublishedContent:async()=>({snapshot:{settings:{siteUrl:'https://published.example.test'}}})}));
import sitemap from '@/app/sitemap';
import robots from '@/app/robots';
it('sitemap uses the published canonical origin across existing locale routes',async()=>{
  const entries=await sitemap();
  expect(entries).toHaveLength(39);
  expect(entries[0].url).toBe('https://published.example.test/en');
  expect(entries.every(entry=>entry.url.startsWith('https://published.example.test/'))).toBe(true);
  expect(entries[0].alternates?.languages?.ja).toBe('https://published.example.test/ja');
});
it('robots uses the same published host and sitemap origin',async()=>{
  expect(await robots()).toMatchObject({host:'https://published.example.test',sitemap:'https://published.example.test/sitemap.xml'});
});
