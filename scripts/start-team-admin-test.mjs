import {spawn} from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import {cp,mkdir,symlink,rm} from 'node:fs/promises';
import {root,localRoot,localEnvironment} from './platform/local.mjs';
const port=process.env.A4_TEST_PORT || '4257';
if (!/^42\d\d$/.test(port)) throw Error('Local test port required');
const source=path.join(root,'related/admin'),runtime=path.join(localRoot,'tests',`admin-${port}`);
await rm(runtime,{recursive:true,force:true});await mkdir(runtime,{recursive:true});
await cp(source,runtime,{recursive:true,filter:file=>!path.relative(source,file).split(path.sep).some(part=>part==='node_modules'||part.startsWith('.next')||part.startsWith('.env')||['test-results','playwright-report','coverage'].includes(part))});
// Test dev only. Stock build validation uses the independent installed application, never this link.
await symlink(path.join(source,'node_modules'),path.join(runtime,'node_modules'));
const env=localEnvironment(),sockets=new Set(),relays=new Set();
const relay=port==='4257'?net.createServer(socket=>{
 sockets.add(socket);const child=spawn('docker',['exec','-i','supabase_inbucket_lumiq-platform','nc','127.0.0.1','1025'],{env,stdio:['pipe','pipe','ignore']});
 relays.add(child);socket.pipe(child.stdin);child.stdout.pipe(socket);socket.on('error',()=>child.kill());child.stdin.on('error',()=>socket.destroy());socket.on('close',()=>{sockets.delete(socket);child.kill();});child.on('exit',()=>{relays.delete(child);socket.destroy();});
}).listen(54325,'127.0.0.1'):null;
const child=spawn(process.execPath,[path.join(source,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','127.0.0.1','--port',port],{cwd:runtime,env,stdio:'inherit'});
function close(signal){child.kill(signal);relay?.close();for(const socket of sockets)socket.destroy();for(const relayChild of relays)relayChild.kill();}
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>close(signal));
child.on('exit',code=>{relay?.close();process.exit(code??1);});
