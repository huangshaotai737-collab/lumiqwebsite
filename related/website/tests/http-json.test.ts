import {describe,expect,it} from 'vitest';
import {readJson,failure} from '../lib/http/result';
describe('JSON request boundary',()=>{
 it('preserves valid request data',async()=>{expect(await readJson(new Request('http://localhost',{method:'POST',body:'{"name":"LumiQ"}'}))).toEqual({name:'LumiQ'});});
 for(const body of ['', '{broken'])it('returns input error for malformed body '+JSON.stringify(body),async()=>{
  let error:unknown;try{await readJson(new Request('http://localhost',{method:'POST',body}));}catch(e){error=e;}
  const response=failure(error);expect(response.status).toBe(400);expect((await response.json()).error).toBe('INVALID_INPUT');
 });
});
