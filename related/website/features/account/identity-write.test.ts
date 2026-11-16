import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const state=vi.hoisted(()=>({writes:0,id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}));
vi.mock('@/lib/auth/require-user',()=>({requireUser:async()=>({userId:state.id,emailVerified:true})}));
vi.mock('@/lib/auth/server',()=>({createClient:async()=>({auth:{updateUser:async()=>{state.writes++;return {error:null};},signOut:async()=>({error:null})},from:()=>({update:()=>{state.writes++;return {eq:()=>({select:()=>({maybeSingle:async()=>({data:{user_id:state.id,display_name:'A',locale:'en',shipping_address:{}},error:null})})})};}})})}));
vi.mock('@/lib/http/rate-limit',()=>({clientAddress:()=>'',enforceRateLimit:async()=>{}}));
import {updateOwnProfile} from './service';
import {PATCH} from '@/app/api/auth/reset/route';
beforeEach(()=>{state.writes=0;vi.stubEnv('APP_ORIGIN','https://website.example');});
for(const expectedUserId of [undefined,'malformed','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa']) {
 it(`profile refuses identity ${expectedUserId}`,async()=>{
 const result=await updateOwnProfile({displayName:'A',locale:'en',shippingAddress:null,expectedUserId} as Parameters<typeof updateOwnProfile>[0]);
 expect(result.ok).toBe(false);expect(state.writes).toBe(0);
 });
 it(`password refuses identity ${expectedUserId}`,async()=>{
 const response=await PATCH(new Request('https://website.example/api/auth/reset',{method:'PATCH',headers:{origin:'https://website.example','content-type':'application/json'},body:JSON.stringify({password:'AnotherPassword123!',expectedUserId})}));
 expect(response.status).toBeGreaterThanOrEqual(400);expect(state.writes).toBe(0);
 });
}
it('same actor can save profile and password',async()=>{
 expect((await updateOwnProfile({displayName:'A',locale:'en',shippingAddress:null,expectedUserId:state.id} as Parameters<typeof updateOwnProfile>[0])).ok).toBe(true);
 const response=await PATCH(new Request('https://website.example/api/auth/reset',{method:'PATCH',headers:{origin:'https://website.example','content-type':'application/json'},body:JSON.stringify({password:'AnotherPassword123!',expectedUserId:state.id})}));
 expect(response.status).toBe(200);expect(state.writes).toBe(2);
});
