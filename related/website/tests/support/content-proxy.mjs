// Local integration fixture only. No application import or production endpoint.
import http from 'node:http';
let mode='normal';
const upstream=new URL(process.env.LUMIQ_CONTENT_TEST_UPSTREAM);
if(!['localhost','127.0.0.1'].includes(upstream.hostname))throw Error('Synthetic local upstream required');
const server=http.createServer(async(req,res)=>{
  if(req.url==='/__control'&&req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;
    const next=JSON.parse(body).mode;
    if(!['normal','failed','invalid','empty'].includes(next)){res.writeHead(400).end();return;}
    mode=next;res.writeHead(204).end();return;
  }
  if(req.url==='/__health'){res.writeHead(200).end('ready');return;}
  if(req.url==='/rest/v1/rpc/get_published_content'&&mode!=='normal'){
    res.writeHead(mode==='failed'?503:200,{'content-type':'application/json','cache-control':'no-store'});
    res.end(mode==='empty'?'null':JSON.stringify(mode==='failed'?{message:'Synthetic database failure'}:{releaseId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',snapshot:{schemaVersion:9}}));return;
  }
  const target=new URL(req.url,upstream);
  const forwarded=http.request(target,{method:req.method,headers:{...req.headers,host:upstream.host}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});
  forwarded.on('error',()=>{res.writeHead(503).end();});req.pipe(forwarded);
});
server.listen(4258,'127.0.0.1');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>process.exit(0)));
