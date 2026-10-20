import {mkdirSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';
export function acquireRunLock(directory){
 try{mkdirSync(directory);}catch(error){if(error.code==='EEXIST')throw Error('Another verifier owns this runtime. Wait for it to finish; never refresh a live test mirror. After an interrupted process, inspect owner.json before manually removing a stale lock.');throw error;}
 writeFileSync(path.join(directory,'owner.json'),JSON.stringify({pid:process.pid,startedAt:new Date().toISOString()})+'\n',{mode:0o600});
 return ()=>rmSync(directory,{recursive:true,force:true});
}
