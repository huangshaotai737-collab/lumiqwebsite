import {readFile,writeFile,access} from 'node:fs/promises';
import path from 'node:path';
import {root,localRoot,captureLocal} from './local.mjs';
await captureLocal();
const marker=path.join(localRoot,'preview-initialized.json');
try{await access(marker);throw Error('Preview already initialized; existing user edits must be preserved');}catch(error){if(error.code!=='ENOENT')throw error;}
const config=JSON.parse(await readFile(path.join(localRoot,'preview-credentials.json'),'utf8'));
const account=config.accounts.find(a=>a.role==='admin'),origin='http://127.0.0.1:4270';
const login=await fetch(`${origin}/api/auth/signin`,{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify({...account,next:'/'})});
if(!login.ok)throw Error('Local staff login failed');
const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
async function post(route,data){const response=await fetch(origin+route,{method:'POST',headers:{'Content-Type':'application/json',origin,cookie},body:JSON.stringify(data)});const result=await response.json();if(!response.ok||!result.ok)throw Error(`Initial content ${route} failed (${response.status})`);return result.data;}
const snapshot=JSON.parse(await readFile(path.join(root,'related/admin/features/content/initial-snapshot.json'),'utf8'));
const draft=await post('/api/content/drafts',{id:crypto.randomUUID(),expectedVersion:0,snapshot});
const release=await post('/api/content/publish',{id:draft.id,expectedVersion:draft.version});
await writeFile(marker,JSON.stringify({localOnly:true,initializedAt:new Date().toISOString(),draftId:draft.id,releaseId:release.id||release.releaseId||null})+'\n',{mode:0o600});
console.log('Initial brand snapshot saved and published through the actual local admin API.');
