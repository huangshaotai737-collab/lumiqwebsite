import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import {acquireRunLock} from '../platform/run-lock.mjs';
const fixture=new URL('./support/stage-owner-fixture.mjs',import.meta.url);
async function until(predicate){for(let i=0;i<150;i++){if(predicate())return;await delay(30);}throw Error('Process fixture timed out');}
function alive(pid){try{execFileSync('ps',['-p',String(pid),'-o','stat='],{encoding:'utf8'});return true;}catch{return false;}}
for(const signal of ['SIGTERM','SIGINT'])test(`${signal} stops and reaps stage and separate-group grandchild before next owner`,{timeout:12000},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'lumiq-process-'));
 const supervisor=spawn(process.execPath,[fixture.pathname,'supervisor',directory],{stdio:['ignore','ignore','pipe']});
 const completion=new Promise(resolve=>supervisor.once('close',(code)=>resolve(code)));let pids;
 try{
  await until(()=>existsSync(`${directory}/ready.json`));pids=JSON.parse(readFileSync(`${directory}/ready.json`,'utf8'));await delay(100);
  supervisor.kill(signal);supervisor.kill(signal); // Double signal must not release twice.
  assert.throws(()=>acquireRunLock(`${directory}/lock`),/Another verifier/);
  assert.equal(await completion,130);assert.equal(alive(pids.stage),false);assert.equal(alive(pids.grandchild),false);
  const successor=acquireRunLock(`${directory}/lock`);await delay(100);assert.throws(()=>acquireRunLock(`${directory}/lock`),/Another verifier/);successor();
 }finally{supervisor.kill('SIGKILL');for(const pid of Object.values(pids||{}))try{process.kill(pid,'SIGKILL');}catch{}rmSync(directory,{recursive:true,force:true});}
});
test('cancellation during asynchronous preparation holds lock until preparation settles and starts no stage',{timeout:12000},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'lumiq-prepare-'));
 const supervisor=spawn(process.execPath,[fixture.pathname,'prepare',directory],{stdio:'ignore'});
 const completion=new Promise(resolve=>supervisor.once('close',resolve));
 try{await until(()=>existsSync(`${directory}/ready.json`));supervisor.kill('SIGTERM');await delay(100);assert.throws(()=>acquireRunLock(`${directory}/lock`),/Another verifier/);assert.equal(await completion,130);assert.equal(existsSync(`${directory}/unexpected`),false);acquireRunLock(`${directory}/lock`)();}
 finally{supervisor.kill('SIGKILL');rmSync(directory,{recursive:true,force:true});}
});
test('spawn failure is reaped before ownership is released',{timeout:12000},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'lumiq-spawn-error-'));
 try{const child=spawn(process.execPath,[fixture.pathname,'spawn-error',directory],{stdio:'ignore'});assert.equal(await new Promise(resolve=>child.once('close',resolve)),1);acquireRunLock(`${directory}/lock`)();}
 finally{rmSync(directory,{recursive:true,force:true});}
});

test('failed process inspection conservatively retains the ownership lock',{timeout:12000},async()=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'lumiq-inspection-error-'));
 try{const child=spawn(process.execPath,[fixture.pathname,'inspection-error',directory],{stdio:'ignore'});assert.equal(await new Promise(resolve=>child.once('close',resolve)),1);assert.throws(()=>acquireRunLock(`${directory}/lock`),/Another verifier/);}
 finally{rmSync(directory,{recursive:true,force:true});}
});
