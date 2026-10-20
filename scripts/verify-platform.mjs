#!/usr/bin/env node
// Local/CI only. Database population tests run strictly before browser fixtures.
import path from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {mkdir,writeFile,readFile,readdir,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {acquireRunLock} from './platform/run-lock.mjs';
import {root,localRoot,captureLocal,prepareMirror,assertTestBoundary} from './platform/local.mjs';
if (Number(process.versions.node.split('.')[0])<22) throw Error('Node 22 or later is required');
const selected=process.argv.find(v=>v.startsWith('--stage='))?.slice(8);
const browserFrom=process.argv.find(v=>v.startsWith('--browser-from='))?.slice(15);
if(browserFrom && selected!=='browsers') throw Error('--browser-from requires --stage=browsers; earlier results are not implied');
if(process.argv.some(v=>v.startsWith('--')&&!v.startsWith('--stage=')&&!v.startsWith('--browser-from='))) throw Error('Unknown verification option');
await mkdir(localRoot,{recursive:true,mode:0o700});
const releaseLock=acquireRunLock(path.join(localRoot,'verification.lock'));
process.on('exit',releaseLock);
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{releaseLock();process.exit(130);});
const {env}=await captureLocal();
if(!selected || ['database','browsers','counterexamples'].includes(selected))await assertTestBoundary(env);
const mirror=path.join(localRoot,'verification'),evidence=path.join(localRoot,'evidence','verification');
await mkdir(evidence,{recursive:true});
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(file=>/^(related\/|scripts\/|contracts\/|supabase\/|\.github\/)/.test(file)).sort();
const hash=createHash('sha256'),inputFiles={};for(const file of files){const content=await readFile(path.join(root,file));hash.update(file);hash.update(content);inputFiles[file]=createHash('sha256').update(content).digest('hex');}
const scopeHash=accept=>{const digest=createHash('sha256');for(const file of files)if(accept(file)){digest.update(file+'\0'+inputFiles[file]+'\n');}return digest.digest('hex');};
const inputScopes={database:scopeHash(file=>file.startsWith('supabase/')||file.startsWith('scripts/')),contracts:scopeHash(file=>/^(contracts\/|related\/|scripts\/|supabase\/)/.test(file)),adminApp:scopeHash(file=>file.startsWith('related/admin/')||file.startsWith('contracts/')||file.startsWith('scripts/')),websiteApp:scopeHash(file=>file.startsWith('related/website/')||file.startsWith('contracts/')||file.startsWith('scripts/'))};
const report={inputFiles,inputScopes,commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),sourceSha256:hash.digest('hex'),node:process.version,platform:process.platform,startedAt:new Date().toISOString(),selected:selected||'all',browserFrom:browserFrom||null,stages:[]};
async function checkpoint(){await writeFile(path.join(evidence,selected?`targeted-${selected}.json`:'result.json'),JSON.stringify(report,null,2)+'\n');}
async function command(name,cmd,args,cwd=mirror,extra={}){
 console.log(`START ${name}`);const log=await import('node:fs').then(fs=>fs.createWriteStream(path.join(evidence,`${name}.log`)));
 const start=Date.now();let exitCode;
 try {exitCode=await new Promise((resolve,reject)=>{const child=spawn(cmd,args,{cwd,env:{...env,...extra},stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('exit',resolve);});}
 finally{log.end();}
 report.stages.push({name,exitCode,durationMs:Date.now()-start});await checkpoint();
 console.log(`${exitCode===0?'PASS':'FAIL'} ${name} (${Math.round((Date.now()-start)/1000)}s)`);
 if(exitCode!==0)throw Error(`Stage ${name} failed; see .lumiq-local/evidence/verification/${name}.log`);
}
const stages={};
stages.install=async()=>{await prepareMirror(mirror);};
stages.contracts=async()=>{
 await command('contracts','node',['scripts/sync-platform-contracts.mjs','--check']);
 await command('content-export','node',['scripts/export-initial-content.mjs','--check'],path.join(mirror,'related/website'));
 const types=execFileSync('supabase',['gen','types','typescript','--local'],{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','pipe']});
 for(const app of ['admin','website'])if((await readFile(path.join(root,`related/${app}/lib/generated/database.ts`),'utf8')).replace(/[ \t]+$/gm,'').trim()!==types.replace(/[ \t]+$/gm,'').trim())throw Error(`Generated database types drift: ${app}`);
 console.log('PASS generated database types (both apps)');
};
stages.database=async()=>{
 const sql=(await readdir(path.join(root,'supabase/tests/database'))).filter(f=>f.endsWith('.sql')&&f!=='order-concurrency.test.sql').sort().map(f=>`supabase/tests/database/${f}`);
 await command('sql-permissions','supabase',['test','db',...sql]);
 await command('sql-order-concurrency','node',['scripts/test-order-concurrency.mjs','--local-test-only']);
 await command('sql-security-advisors','supabase',['db','advisors','--local','--type','security','--level','warn','--fail-on','error']);
};
stages.checks=async()=>{
 const tests=(await readdir(path.join(root,'scripts/tests'))).filter(f=>f.endsWith('.test.mjs')).map(f=>`scripts/tests/${f}`);
 await command('root-tests','node',['--test',...tests]);
 for(const app of ['admin','website']) {
  const cwd=path.join(mirror,'related',app);
  for(const check of ['test','typecheck','lint'])await command(`${app}-${check}`,'npm',['run',check],cwd);
  await command(`${app}-audit-production`,'npm',['audit','--omit=dev','--audit-level=low'],cwd);
 }
 await command('website-i18n','npm',['run','check:i18n'],path.join(mirror,'related/website'));
};
stages.build=async()=>{
 for(const app of ['admin','website'])await command(`${app}-stock-build`,'npm',['run','build'],path.join(mirror,'related',app),{NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_SERVICE_ROLE_KEY:'',SUPABASE_SECRET_KEY:'',APP_ORIGIN:''});
};
stages.browsers=async()=>{
 const owners=[...['shell','auth','team','content','media'].map(mode=>({name:`admin-platform-${mode}`,app:'admin',script:'test:e2e',extra:{LUMIQ_PLATFORM_SUITE:mode}})),
 ...[['website','platform'],['website','account'],['admin','operations'],['admin','catalog'],['website','orders'],['admin','orders'],['website','payments'],['admin','payments'],['admin','privacy']].map(([app,suite])=>({name:`${app}-${suite}`,app,script:`test:e2e:${suite}`,extra:{}}))];
 const from=browserFrom?owners.findIndex(owner=>owner.name===browserFrom):0;
 if(from<0)throw Error('Unknown browser owner');
 for(const owner of owners.slice(from)) {
  const cwd=path.join(mirror,'related',owner.app);
  try {await command(owner.name,'npm',['run',owner.script],cwd,owner.extra);}
  finally {
   // The next Playwright owner clears test-results; preserve its synthetic visual evidence first.
   const destination=path.join(localRoot,'evidence','visual',owner.name);await mkdir(destination,{recursive:true});
   for(const file of await readdir(path.join(cwd,'test-results')).catch(()=>[]))if(file.endsWith('.png'))await copyFile(path.join(cwd,'test-results',file),path.join(destination,file));
  }
 }
};
stages.counterexamples=async()=>{await command('counterexamples','node',['scripts/platform/counterexamples.mjs'],root);};
if(selected&&!Object.hasOwn(stages,selected))throw Error(`Unknown stage ${selected}`);
try {
 if(selected&&selected!=='install')await prepareMirror(mirror,{install:false});
 for(const [name,operation] of Object.entries(stages))if(!selected||selected===name){await operation();}
 report.finishedAt=new Date().toISOString();report.status='PASS';await checkpoint();console.log('PASS platform verification');
}catch(error){report.status='FAIL';report.error=error.message;await checkpoint();console.error(error.message);process.exitCode=1;}
