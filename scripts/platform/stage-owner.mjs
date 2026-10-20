import {spawn,execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {acquireRunLock} from './run-lock.mjs';

// POSIX local/CI runner. Snapshot identity prevents signalling a reused PID.
function snapshot(){
 const rows=execFileSync('ps',['-axo','pid=,ppid=,pgid=,stat=,lstart='],{encoding:'utf8'});
 const processes=new Map();
 for(const line of rows.split('\n')){
  const match=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
  if(match)processes.set(Number(match[1]),{pid:Number(match[1]),parent:Number(match[2]),group:Number(match[3]),state:match[4],identity:match[5]});
 }
 return processes;
}
export class VerificationCancelled extends Error {
 constructor(){super('Verification cancelled');this.exitCode=130;}
}
class StageOwner {
 records=[];
 known=new Map();
 cancelled=false;
 observationFailed=false;
 constructor(){
  if(process.platform==='win32')throw Error('The owned verifier requires POSIX process supervision (macOS/Linux)');
  snapshot(); // Fail before starting any stage if ownership cannot be inspected.
  this.timer=setInterval(()=>{try{this.observe();}catch{this.observationFailed=true;}},100);
  this.timer.unref();
 }
 throwIfCancelled(){if(this.cancelled)throw new VerificationCancelled();}
 observe(){
  const table=snapshot(),owned=new Set();
  for(const [pid,identity] of this.known)if(table.get(pid)?.identity===identity)owned.add(pid);
  for(const record of this.records)if(!record.closed&&table.has(record.child.pid))owned.add(record.child.pid);
  let changed=true;
  while(changed){changed=false;for(const item of table.values())if(!owned.has(item.pid)&&owned.has(item.parent)){owned.add(item.pid);changed=true;}}
  for(const pid of owned)this.known.set(pid,table.get(pid).identity);
  return [...owned].map(pid=>table.get(pid));
 }
 async execute(command,args,options={}){
  this.throwIfCancelled();
  const {onSpawn,...spawnOptions}=options;
  const child=spawn(command,args,{...spawnOptions,detached:true});
  const record={child,closed:false};this.records.push(record);
  const completion=new Promise((resolve,reject)=>{
   child.once('error',reject);
   child.once('close',(code,signal)=>{record.closed=true;resolve(signal?128:code);});
  });
  completion.catch(()=>{}); // Observe/onSpawn may throw before we await it; teardown still owns the child.
  // A spawn error may have no PID; close still marks it reaped.
  try{this.observe();onSpawn?.(child);return await completion;}
  finally{if(this.cancelled)this.throwIfCancelled();}
 }
 cancel(){this.cancelled=true;return this.stop();}
 stop(){
  if(this.stopping)return this.stopping;
  this.stopping=this.stopTree();return this.stopping;
 }
 async stopTree(){
  const deadline=Date.now()+6000,signalled=new Map();
  try{
   while(Date.now()<deadline){
    const observed=this.observe(),alive=observed.filter(item=>!item.state.startsWith('Z'));
    if(observed.length===0&&this.records.every(record=>record.closed))return !this.observationFailed;
    // Stop descendants first, leaving parents alive long enough to reap them.
    const parents=new Set(observed.map(item=>item.parent));
    for(const item of alive.filter(item=>!parents.has(item.pid))){
     const first=signalled.get(item.pid),signal=first&&Date.now()-first>1500?'SIGKILL':'SIGTERM';
     if(first&&signal==='SIGTERM')continue;
     try{process.kill(item.pid,signal);signalled.set(item.pid,first||Date.now());}catch(error){if(error.code!=='ESRCH')throw error;}
    }
    await delay(30);
   }
  }catch{return false;}
  return false;
 }
 dispose(){clearInterval(this.timer);}
}
export async function withStageOwnership(directory,task){
 const release=acquireRunLock(directory);
 let owner;
 try{owner=new StageOwner();}catch(error){release();throw error;}
 const cancel=()=>{void owner.cancel();};
 process.on('SIGTERM',cancel);process.on('SIGINT',cancel);
 try{
  const result=await task(owner);owner.throwIfCancelled();return result;
 }finally{
  // Await the task's current asynchronous preparation too; no exit handler unlocks early.
  const stopped=await owner.stop();owner.dispose();
  process.off('SIGTERM',cancel);process.off('SIGINT',cancel);
  if(stopped)release();
  else{console.error('Owned process teardown could not be proven; retaining stale verification lock.');process.exitCode=1;}
 }
}
