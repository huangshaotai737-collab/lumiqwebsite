import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {acquireRunLock} from '../platform/run-lock.mjs';
test('concurrent verifier cannot refresh the active owner runtime and release permits the next run',()=>{
 const temporary=mkdtempSync(path.join(os.tmpdir(),'lumiq-lock-')),directory=path.join(temporary,'lock');
 try{const release=acquireRunLock(directory);assert.throws(()=>acquireRunLock(directory),/Another verifier/);assert.ok(existsSync(path.join(directory,'owner.json')));release();acquireRunLock(directory)();}finally{rmSync(temporary,{recursive:true,force:true});}
});
test('an old release callback cannot remove a successor lock',()=>{
 const temporary=mkdtempSync(path.join(os.tmpdir(),'lumiq-lock-successor-')),directory=path.join(temporary,'lock');
 try{const old=acquireRunLock(directory);old();const successor=acquireRunLock(directory);old();assert.throws(()=>acquireRunLock(directory),/Another verifier/);successor();}finally{rmSync(temporary,{recursive:true,force:true});}
});
test('token ownership prevents an unreleased stale callback deleting a replacement lock',()=>{
 const temporary=mkdtempSync(path.join(os.tmpdir(),'lumiq-lock-token-')),directory=path.join(temporary,'lock');
 try{const stale=acquireRunLock(directory);rmSync(directory,{recursive:true});const replacement=acquireRunLock(directory);stale();assert.throws(()=>acquireRunLock(directory),/Another verifier/);replacement();}finally{rmSync(temporary,{recursive:true,force:true});}
});
