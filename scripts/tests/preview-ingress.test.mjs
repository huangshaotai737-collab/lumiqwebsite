import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {createLocalIngress} from '../platform/preview-ingress.mjs';
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));
test('local browser ingress replaces forged forwarding identity and preserves POST origin/body',async()=>{
 const backend=http.createServer(async(request,response)=>{let body='';for await(const chunk of request)body+=chunk;response.setHeader('Content-Type','application/json');response.end(JSON.stringify({headers:request.headers,method:request.method,url:request.url,body}));});
 const upstreamPort=await listen(backend),ingress=createLocalIngress(upstreamPort),port=await listen(ingress);
 try{const origin=`http://127.0.0.1:${port}`,response=await fetch(origin+'/api/example?value=1',{method:'POST',headers:{origin,'x-real-ip':'203.0.113.9','x-forwarded-for':'203.0.113.10','x-vercel-forwarded-for':'203.0.113.11'},body:'synthetic'}),data=await response.json();assert.equal(data.headers['x-real-ip'],'127.0.0.1');assert.equal(data.headers['x-forwarded-for'],undefined);assert.equal(data.headers['x-vercel-forwarded-for'],undefined);assert.equal(data.headers.origin,origin);assert.equal(data.method,'POST');assert.equal(data.body,'synthetic');assert.equal(data.url,'/api/example?value=1');}finally{await close(ingress);await close(backend);}
});
