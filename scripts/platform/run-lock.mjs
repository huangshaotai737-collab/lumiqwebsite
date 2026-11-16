import {mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
export function acquireRunLock(directory){
 try{mkdirSync(directory,{mode:0o700});}catch(error){if(error.code==='EEXIST')throw Error('Another verifier owns this runtime. Wait for it to finish; never refresh a live test mirror. After an interrupted process, inspect owner.json before manually removing a stale lock.');throw error;}
 const token=randomUUID();
 try{writeFileSync(path.join(directory,'owner.json'),JSON.stringify({pid:process.pid,token,startedAt:new Date().toISOString()})+'\n',{mode:0o600});}catch(error){rmSync(directory,{recursive:true,force:true});throw error;}
 let released=false;
 return ()=>{
  if(released)return;
  released=true;
  try{if(JSON.parse(readFileSync(path.join(directory,'owner.json'),'utf8')).token!==token)return;}catch{return;}
  rmSync(directory,{recursive:true,force:true});
 };
}
