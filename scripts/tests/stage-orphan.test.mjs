import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import os from 'node:os';
import path from 'node:path';
import {acquireRunLock} from '../platform/run-lock.mjs';
const fixture=new URL('./support/stage-orphan-fixture.mjs',import.meta.url);
function alive(pid){try{execFileSync('ps',['-p',String(pid),'-o','stat='],{encoding:'utf8'});return true;}catch{return false;}}
for(const mode of ['orphan-same-group','orphan-detached','new-unrelated','baseline-unrelated'])test(`${mode}: early exit cannot release ownership over a surviving unknown child`,{timeout:15000},async t=>{
 const directory=mkdtempSync(path.join(os.tmpdir(),'lumiq-orphan-'));
 const supervisor=spawn(process.execPath,[fixture.pathname,mode,directory],{stdio:['ignore','ignore','pipe']});let stderr='';supervisor.stderr.on('data',chunk=>stderr+=chunk);
 let result;
 try{
  await new Promise(resolve=>supervisor.once('close',resolve));result=JSON.parse(readFileSync(`${directory}/result.json`,'utf8'));assert.ok(result.descendant);t.diagnostic(JSON.stringify({mode,...result,descendantAlive:alive(result.descendant),lockRetained:existsSync(`${directory}/lock`),diagnostic:existsSync(`${directory}/lock/teardown.json`)?JSON.parse(readFileSync(`${directory}/lock/teardown.json`,'utf8')):null}));
  if(mode==='orphan-same-group'){
   assert.equal(alive(result.descendant),false,'same-group child must be attributed and reaped after leader exit');assert.equal(result.errorCode,130);acquireRunLock(`${directory}/lock`)();
  }else if(mode==='baseline-unrelated'){
   assert.equal(alive(result.descendant),true,'pre-existing unrelated process must survive');assert.equal(result.errorCode,null);acquireRunLock(`${directory}/lock`)();
  }else{
   // Detached early-exit children may be attributed if observed, otherwise fail closed.
   const surviving=alive(result.descendant);
   if(mode==='new-unrelated')assert.equal(surviving,true,'unattributed process must never be killed');
   if(surviving){assert.throws(()=>acquireRunLock(`${directory}/lock`),/Another verifier/);assert.match(stderr,/could not be proven/);assert.ok(existsSync(`${directory}/lock/teardown.json`));}
   else acquireRunLock(`${directory}/lock`)();
  }
 }finally{
  supervisor.kill('SIGKILL');if(result?.descendant)try{process.kill(result.descendant,'SIGKILL');}catch{}
  if(result?.descendant)for(let i=0;i<100&&alive(result.descendant);i++)await delay(20);
  rmSync(directory,{recursive:true,force:true});
 }
});
