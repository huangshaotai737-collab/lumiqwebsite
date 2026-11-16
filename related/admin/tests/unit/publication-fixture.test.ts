import {test,expect,vi} from 'vitest';
vi.mock('node:child_process',()=>({execFileSync:vi.fn(()=>{throw Error('injected pointer restore failure');})}));
import {cleanupPublicationOwner} from '../support/publication-fixture';
test('pointer failure and first cleanup failure cannot skip later account disposal',async()=>{
 const calls:string[]=[];
 await expect(cleanupPublicationOwner({singleton:true,release_id:null,updated_at:'2026-01-01T00:00:00Z'},[
 async()=>{calls.push('bucket');throw Error('injected bucket failure');},
 async()=>{calls.push('admin');},async()=>{calls.push('editor');},
 ])).rejects.toThrow(AggregateError);
 expect(calls).toEqual(['bucket','admin','editor']);
});
