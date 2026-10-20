import {previewEnvironment} from './preview-environment.mjs';
import {createLocalIngress} from './preview-ingress.mjs';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {localRoot,localEnvironment} from './local.mjs';
const settings=JSON.parse(await readFile(path.join(localRoot,'preview-config.json'),'utf8'));
const children=[];const env=previewEnvironment(settings,localEnvironment());
const ingresses=[];
for(const [app,port,publicPort] of [['website',4212,4211],['admin',4271,4270]]) {
 const cwd=path.join(localRoot,'preview','related',app);
 children.push(spawn(process.execPath,[path.join(cwd,'node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd,env:{...env,APP_ORIGIN:`http://127.0.0.1:${publicPort}`,WEBSITE_ORIGIN:'http://127.0.0.1:4211'},stdio:'inherit'}));
 ingresses.push(createLocalIngress(port).listen(publicPort,'127.0.0.1'));
}
const relay=net.createServer(socket=>{
 const child=spawn('docker',['exec','-i','supabase_inbucket_lumiq-platform','nc','127.0.0.1','1025'],{env,stdio:['pipe','pipe','ignore']});
 socket.pipe(child.stdin);child.stdout.pipe(socket);socket.on('error',()=>child.kill());child.stdin.on('error',()=>socket.destroy());socket.on('close',()=>child.kill());child.on('exit',()=>socket.destroy());
}).listen(54325,'127.0.0.1');
let stopping=false;
function stop(){if(stopping)return;stopping=true;relay.close();for(const ingress of ingresses)ingress.close();for(const child of children)child.kill('SIGTERM');setTimeout(()=>process.exit(),1500).unref();}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,stop);
for(const child of children)child.on('exit',stop);
