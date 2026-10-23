import {spawn,spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {acquireRunLock} from './run-lock.mjs';

// POSIX local/CI runner. Snapshot identity prevents signalling a reused PID.
function snapshot(){
 const result=spawnSync('ps',['-axo','uid=,pid=,ppid=,pgid=,stat=,lstart='],{encoding:'utf8'});
 if(result.error||result.status!==0)throw Error('Process inspection unavailable');
 const processes=new Map();
 for(const line of result.stdout.split('\n')){
  const match=line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.+)$/);
  if(match&&Number(match[2])!==result.pid)processes.set(Number(match[2]),{uid:Number(match[1]),pid:Number(match[2]),parent:Number(match[3]),group:Number(match[4]),state:match[5],identity:match[6]});
 }
 if(!processes.has(process.pid))throw Error('Process inspection incomplete');
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
  this.baseline=snapshot(); // A new unattributed same-user process is uncertainty, never a kill target.
  this.unknown=[];this.observed=[];
  this.timer=setInterval(()=>{try{this.observe();}catch{this.observationFailed=true;}},100);
  this.timer.unref();
 }
 throwIfCancelled(){if(this.cancelled)throw new VerificationCancelled();}
 observe(){
  const table=snapshot(),owned=new Set();
  for(const [pid,identity] of this.known)if(table.get(pid)?.identity===identity)owned.add(pid);
  for(const record of this.records){
   if(record.groupRetired||!record.child.pid)continue;
   const leader=table.get(record.child.pid);
   if(leader&&record.identity&&leader.identity!==record.identity){record.groupRetired=true;this.observationFailed=true;continue;}
   if(leader&&!record.closed){owned.add(leader.pid);record.identity??=leader.identity;}
   // detached:true creates this PGID. Its membership survives the leader's exit.
   const members=[...table.values()].filter(item=>item.group===record.child.pid);
   for(const item of members)owned.add(item.pid);
   if(record.closed&&members.length===0)record.groupRetired=true;
  }
  let changed=true;
  while(changed){changed=false;for(const item of table.values())if(!owned.has(item.pid)&&owned.has(item.parent)){owned.add(item.pid);changed=true;}}
  for(const pid of owned)this.known.set(pid,table.get(pid).identity);
  this.unknown=[...table.values()].filter(item=>item.uid===process.getuid()&&!owned.has(item.pid)&&this.baseline.get(item.pid)?.identity!==item.identity);
  this.observed=[...owned].map(pid=>table.get(pid));
  return this.observed;
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
  try{this.observe();onSpawn?.(child);const code=await completion;
   // Do not let the next sequential stage overlap an early-exit stage's leftovers.
   if(!(await this.stopTree()))throw Error('Stage process teardown could not be proven');
   return code;}
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
    if(observed.length===0&&this.records.every(record=>record.closed))return !this.observationFailed&&this.unknown.length===0;
    // Stop descendants first, leaving parents alive long enough to reap them.
    const parents=new Set(observed.map(item=>item.parent));
    for(const item of alive.filter(item=>!parents.has(item.pid))){
     const first=signalled.get(item.pid),signal=first&&Date.now()-first>1500?'SIGKILL':'SIGTERM';
     if(first&&signal==='SIGTERM')continue;
     try{process.kill(item.pid,signal);signalled.set(item.pid,first||Date.now());}catch(error){if(error.code!=='ESRCH')throw error;}
    }
    await delay(30);
   }
  }catch{this.observationFailed=true;return false;}
  return false;
 }
 diagnostic(){return {at:new Date().toISOString(),inspectionFailed:this.observationFailed,unknown:this.unknown,owned:this.observed,reason:'Teardown unproven. Never kill unknown processes or automatically remove this lock.'};}
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
  else{
   try{writeFileSync(path.join(directory,'teardown.json'),JSON.stringify(owner.diagnostic(),null,2)+'\n',{mode:0o600});}catch{console.error('Could not persist teardown diagnostic; lock retained.');}
   throw Error('Owned process teardown could not be proven; retaining stale verification lock.');
  }
 }
}
