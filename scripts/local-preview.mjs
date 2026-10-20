#!/usr/bin/env node
import {spawn,execFileSync} from 'node:child_process';
import {readFile,writeFile,open,chmod,access} from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {pathToFileURL} from 'node:url';
import {root,localRoot,captureLocal,prepareMirror,localEnvironment,run,assertTestBoundary} from './platform/local.mjs';
const command=process.argv[2]||'status',statePath=path.join(localRoot,'preview-state.json');
const urls={website:'http://127.0.0.1:4211/en',admin:'http://127.0.0.1:4270/login'};
async function state(){try{return JSON.parse(await readFile(statePath,'utf8'));}catch{return null;}}
async function ownedPid(){const current=await state();if(!current)return null;try{const cmd=execFileSync('ps',['-p',String(current.pid),'-o','command='],{encoding:'utf8'});return cmd.includes(path.join(root,'scripts/platform/preview-server.mjs'))?current.pid:null;}catch{return null;}}
async function free(port){await new Promise((resolve,reject)=>{const server=net.createServer();server.once('error',()=>reject(Error(`Port ${port} is already occupied; do not stop another preview`)));server.listen(port,'127.0.0.1',()=>server.close(resolve));});}
async function privateJson(file,value){await writeFile(path.join(localRoot,file),JSON.stringify(value,null,2)+'\n',{mode:0o600});await chmod(path.join(localRoot,file),0o600);}
if(command==='restart'){await run(process.execPath,[path.join(root,'scripts/local-preview.mjs'),'stop']);await run(process.execPath,[path.join(root,'scripts/local-preview.mjs'),'start']);}
else if(command==='stop'){const pid=await ownedPid();if(pid){process.kill(-pid,'SIGTERM');for(let attempt=0;attempt<60;attempt++){if(!(await ownedPid()))break;await new Promise(resolve=>setTimeout(resolve,100));}if(await ownedPid())throw Error('Owned preview has not stopped yet');console.log('Stopped owned LumiQ preview');}else console.log('No owned preview process running');}
else if(command==='status'){const pid=await ownedPid();const status={running:Boolean(pid),pid,urls};for(const [app,url] of Object.entries(urls)){try{status[`${app}Status`]=(await fetch(url,{signal:AbortSignal.timeout(3000)})).status;}catch{status[`${app}Status`]='unavailable';}}console.log(JSON.stringify(status,null,2));}
else if(command==='start'){
 if(await ownedPid())throw Error('Owned preview already running');for(const port of [4211,4212,4270,4271,54325])await free(port);
 await captureLocal();await readFile(path.join(localRoot,'preview-config.json'));
 const log=await open(path.join(localRoot,'preview.log'),'a',0o600);
 const child=spawn(process.execPath,[path.join(root,'scripts/platform/preview-server.mjs')],{cwd:root,env:localEnvironment(),detached:true,stdio:['ignore',log.fd,log.fd]});child.unref();await log.close();await privateJson('preview-state.json',{pid:child.pid,startedAt:new Date().toISOString(),urls});
 for(let attempt=0;attempt<60;attempt++) {try {const responses=await Promise.all(Object.values(urls).map(url=>fetch(url,{signal:AbortSignal.timeout(3000)})));if(responses.every(r=>r.ok)){console.log(JSON.stringify({ready:true,urls,credentials:path.join(localRoot,'preview-credentials.json')},null,2));process.exit(0);}}catch{}await new Promise(resolve=>setTimeout(resolve,500));}throw Error('Preview readiness failed; inspect private preview.log');
}else if(command==='setup'){
 if(!process.argv.includes('--reset-synthetic-local'))throw Error('Setup requires explicit --reset-synthetic-local; destroys only the guarded synthetic project');
 try{await access(path.join(localRoot,'preview-config.json'));throw Error('Preview is already configured; setup refuses to erase existing staff or user edits. Use start/stop instead.');}catch(error){if(error.code!=='ENOENT')throw error;}
 if(await ownedPid())throw Error('Stop owned preview before resetting synthetic project');
 const {config,env}=await captureLocal();
 await assertTestBoundary(env);
 // Refuse a local reset if any Auth record does not have the reserved synthetic test domain.
 const sql=query=>execFileSync('docker',['exec','-i','supabase_db_lumiq-platform','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{env,input:query,encoding:'utf8'}).trim();
 if(sql("select count(*) from auth.users where email is null or email !~ '@[^@]+\\.(test|invalid)$';")!=='0')throw Error('Non-synthetic or unidentified Auth data: reset refused');
 const dump=execFileSync('docker',['exec','supabase_db_lumiq-platform','pg_dump','-U','postgres','-d','postgres','--data-only','--schema=public','--schema=private'],{env,maxBuffer:100*1024*1024});
 const backup=path.join(localRoot,`synthetic-history-before-preview-${Date.now()}.sql`);await writeFile(backup,dump,{mode:0o600});
 await run('supabase',['db','reset','--local'],root,env);
 await prepareMirror(path.join(localRoot,'preview'));
 const {createClient}=await import(pathToFileURL(path.join(localRoot,'preview/related/admin/node_modules/@supabase/supabase-js/dist/index.mjs')).href);
 const backend=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}}),credentials={localOnly:true,urls,accounts:[]};
 for(const role of ['admin','editor','operations']) {
  const email=`local-${role}@lumiq.example.test`,password=`Local-${crypto.randomUUID()}!`;
  const {data,error}=await backend.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{display_name:`本地测试${role}`}});if(error||!data.user)throw Error('Local staff setup failed');
  const result=await backend.from('staff_memberships').insert({user_id:data.user.id,role,active:true});if(result.error)throw Error('Local staff membership failed');
  credentials.accounts.push({role,email,password});
 }
 const previewEnv={NEXT_PUBLIC_SUPABASE_URL:config.API_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:config.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:config.SERVICE_ROLE_KEY,SUPABASE_SECRET_KEY:'',REQUEST_LIMIT_SALT:`local-preview-${crypto.randomUUID()}`,REQUEST_IP_HEADER:'x-real-ip',MEDIA_STORAGE_MAX_BYTES:'52428800',MEDIA_FFPROBE_PATH:env.MEDIA_FFPROBE_PATH,SMTP_HOST:'127.0.0.1',SMTP_PORT:'54325',STAFF_INVITE_FROM:'LumiQ Local <staff@example.test>',NEXT_TELEMETRY_DISABLED:'1'};
 await privateJson('preview-config.json',{env:previewEnv});await privateJson('preview-credentials.json',credentials);
 for(const app of ['admin','website'])await run('npm',['run','build'],path.join(localRoot,'preview','related',app),{...env,...previewEnv,APP_ORIGIN:app==='admin'?'http://127.0.0.1:4270':'http://127.0.0.1:4211',WEBSITE_ORIGIN:'http://127.0.0.1:4211'});
 console.log('Local preview configured; start with node scripts/local-preview.mjs start');
}else throw Error('Use setup --reset-synthetic-local, start, restart, stop or status');
