import {spawn} from 'node:child_process';
import fs from 'node:fs';
fs.mkdirSync('qa/release-platform',{recursive:true});
const log=fs.openSync('qa/release-platform/server.log','w');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','4223'],{stdio:['ignore',log,log]});
try {
 let ready=false;
 for(let i=0;i<120;i++){
  if(server.exitCode!==null)throw Error('Preview server exited');
  try {if((await fetch('http://localhost:4223/en')).ok){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,500));
 }
 if(!ready)throw Error('Preview server did not become ready');
 await import('./check-webgl-fallback.mjs');
 await import('./check-release-platform.mjs');
 await import('./check-detail-hero.mjs');
}finally{server.kill();fs.closeSync(log);}
