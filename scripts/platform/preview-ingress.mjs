import http from 'node:http';
export function createLocalIngress(upstreamPort) {
 return http.createServer((request,response)=>{
  const headers={...request.headers,'x-real-ip':request.socket.remoteAddress,'x-forwarded-host':request.headers.host,'x-forwarded-proto':'http'};
  delete headers['x-vercel-forwarded-for'];delete headers['x-forwarded-for'];
  const upstream=http.request({hostname:'127.0.0.1',port:upstreamPort,path:request.url,method:request.method,headers},received=>{
   response.writeHead(received.statusCode||502,received.headers);received.on('error',()=>response.destroy());received.pipe(response);
  });
  upstream.on('error',()=>{if(!response.headersSent)response.writeHead(503,{'Content-Type':'application/json'});response.end('{"ok":false,"error":"UNAVAILABLE"}');});
  request.on('aborted',()=>upstream.destroy());request.on('error',()=>upstream.destroy());
  response.on('close',()=>{if(!response.writableEnded)upstream.destroy();});request.pipe(upstream);
 });
}
