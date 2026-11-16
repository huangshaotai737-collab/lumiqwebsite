import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {withStageOwnership} from '../../platform/stage-owner.mjs';
const [mode,directory]=process.argv.slice(2);
let descendant,errorCode=null;
const idle=()=>{const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:true,stdio:'ignore'});child.unref();return child.pid;};
if(mode==='baseline-unrelated')descendant=idle();
try{await withStageOwnership(`${directory}/lock`,async owner=>{
 if(mode==='new-unrelated'){descendant=idle();return;}
 if(mode==='baseline-unrelated'){await owner.execute(process.execPath,['-e',''],{stdio:'ignore'});return;}
 let output='';
 try{await owner.execute(process.execPath,['-e',`const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{detached:${mode==='orphan-detached'},stdio:'ignore'});console.log(c.pid);c.unref();`],{stdio:['ignore','pipe','ignore'],onSpawn:c=>c.stdout.on('data',chunk=>output+=chunk)});}
 finally{descendant=Number(output.trim());}
 if(mode==='orphan-same-group'){process.kill(process.pid,'SIGTERM');await delay(150);owner.throwIfCancelled();}
});}catch(error){errorCode=error.exitCode||1;console.error(error.message);}
writeFileSync(`${directory}/result.json`,JSON.stringify({descendant,errorCode}));
