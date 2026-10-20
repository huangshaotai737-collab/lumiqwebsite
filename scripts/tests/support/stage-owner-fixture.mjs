import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {withStageOwnership} from '../../platform/stage-owner.mjs';
const [mode,directory]=process.argv.slice(2);
if(mode==='grandchild'){
 process.on('SIGTERM',()=>{setTimeout(()=>process.exit(),350);});
 setInterval(()=>{},1000);
}else if(mode==='stage'){
 const child=spawn(process.execPath,[import.meta.filename,'grandchild',directory],{detached:true,stdio:'ignore'});
 writeFileSync(`${directory}/ready.json`,JSON.stringify({stage:process.pid,grandchild:child.pid}));
 setInterval(()=>{},1000);
}else{
 try{await withStageOwnership(`${directory}/lock`,async owner=>{
  if(mode==='prepare'){
   writeFileSync(`${directory}/ready.json`,'{}');
   await delay(500);owner.throwIfCancelled();
   writeFileSync(`${directory}/unexpected`,'started');
  }else if(mode==='empty-inspection'){writeFileSync(`${directory}/ps`,'#!/bin/sh\nexit 0\n',{mode:0o700});process.env.PATH=directory;}else if(mode==='inspection-error'){process.env.PATH=directory;}else if(mode==='spawn-error')await owner.execute(`${directory}/missing`,[],{stdio:'ignore'});
  else await owner.execute(process.execPath,[import.meta.filename,'stage',directory],{stdio:'ignore'});
 });}catch(error){process.exitCode=error.exitCode||1;}
}
