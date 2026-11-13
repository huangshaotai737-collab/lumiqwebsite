import {afterEach,describe,expect,it,vi} from 'vitest';
const exportWaitlist=vi.hoisted(()=>vi.fn(async(query:unknown)=>{void query;return new Response('csv',{status:200});}));
vi.mock('./service',()=>({exportWaitlist}));
import * as route from '@/app/api/waitlist/export/route';

afterEach(()=>{vi.unstubAllEnvs();exportWaitlist.mockClear();});
describe('export requires an intentional same-origin write',()=>{
  it('has no GET handler that cross-site navigation can trigger',()=>{expect('GET' in route).toBe(false);});
  it('refuses cross-site POST before creating an export or consuming quota',async()=>{
    vi.stubEnv('APP_ORIGIN','http://127.0.0.1:4270');
    const response=await (route as unknown as {POST:(request:Request)=>Promise<Response>}).POST(new Request('http://127.0.0.1:4270/api/waitlist/export',{method:'POST',headers:{Origin:'https://other.example','Sec-Fetch-Site':'cross-site'}}));
    expect(response.status).toBe(403);expect(exportWaitlist).not.toHaveBeenCalled();
  });
  it('keeps same-origin filtered export available',async()=>{
    vi.stubEnv('APP_ORIGIN','http://127.0.0.1:4270');
    const response=await (route as unknown as {POST:(request:Request)=>Promise<Response>}).POST(new Request('http://127.0.0.1:4270/api/waitlist/export?search=example&status=new',{method:'POST',headers:{Origin:'http://127.0.0.1:4270'}}));
    expect(response.status).toBe(200);expect(exportWaitlist).toHaveBeenCalledOnce();expect(exportWaitlist.mock.calls[0][0]).toMatchObject({search:'example',status:'new'});
  });
});
