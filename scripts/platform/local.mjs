import {execFileSync, spawn} from 'node:child_process';
import {readFile, mkdir, writeFile, chmod, cp, rm, readdir} from 'node:fs/promises';
import path from 'node:path';
import {parseEnv} from 'node:util';
import {fileURLToPath} from 'node:url';
export const root = fileURLToPath(new URL('../../', import.meta.url));
export const localRoot = path.join(root, '.lumiq-local');
export function localEnvironment() {
  const env = {...process.env, NEXT_TELEMETRY_DISABLED:'1'};
  delete env.NO_COLOR; delete env.FORCE_COLOR;
  if (!env.MEDIA_FFPROBE_PATH || env.MEDIA_FFPROBE_PATH === 'ffprobe') env.MEDIA_FFPROBE_PATH = execFileSync('which',['ffprobe'],{encoding:'utf8'}).trim();
  if (!path.isAbsolute(env.MEDIA_FFPROBE_PATH)) throw Error('MEDIA_FFPROBE_PATH must be an absolute installed binary path');
  if (!env.DOCKER_HOST && process.platform === 'darwin') env.DOCKER_HOST = 'unix:///Users/huangshaotai/.colima/lumiq-platform/docker.sock';
  return env;
}
export function assertLocal(config) {
  if (config.API_URL !== 'http://127.0.0.1:54321' || !config.ANON_KEY || !config.SERVICE_ROLE_KEY) throw Error('Expected synthetic loopback lumiq-platform configuration');
  if (config.DB_URL && !/^postgresql:\/\/postgres:[^@]+@127\.0\.0\.1:54322\/postgres$/.test(config.DB_URL)) throw Error('Nonlocal database refused');
  return config;
}
export async function captureLocal() {
  const env = localEnvironment();
  if (!(await readFile(path.join(root,'supabase/config.toml'),'utf8')).includes('project_id = "lumiq-platform"')) throw Error('Wrong local project');
  const status = execFileSync('supabase',['status','-o','env'],{cwd:root, env, encoding:'utf8',stdio:['ignore','pipe','pipe']});
  const config = assertLocal(parseEnv(status));
  const identity = execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.supabase.cli.project"}}','supabase_db_lumiq-platform'],{env, encoding:'utf8'}).trim();
  if (identity !== 'lumiq-platform') throw Error('Local container project identity mismatch');
  await mkdir(localRoot,{recursive:true,mode:0o700});
  const file = path.join(localRoot,'test.env');
  await writeFile(file,status,{mode:0o600}); await chmod(file,0o600);
  return {config, file, env:{...env,LUMIQ_TEST_ENV_FILE:file}};
}
export async function run(command,args,cwd=root,env=localEnvironment()) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,env,stdio:'inherit'});
    child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(`${command} ${args.join(' ')} failed (${code})`)));
  });
}
// Preserve repository-relative test imports while giving each app a real independent install.
export async function prepareMirror(destination, {install=true}={}) {
  if (!destination.startsWith(localRoot+path.sep)) throw Error('Owned local runtime required');
  await mkdir(destination,{recursive:true});
  for (const directory of ['related/admin','related/website','scripts','contracts','supabase']) {
    const source=path.join(root,directory), target=path.join(destination,directory);
    await mkdir(target,{recursive:true});
    for (const entry of await readdir(target)) if (entry !== 'node_modules' && !entry.startsWith('.next')) await rm(path.join(target,entry),{recursive:true,force:true});
    // Fresh code, keeping only independently installed dependencies and build caches.
    await cp(source,target,{recursive:true,force:true,filter:file=>!path.relative(source,file).split(path.sep).some(part=>part==='node_modules'||part.startsWith('.next')||part.startsWith('.env')||['.temp','.branches','test-results','playwright-report','coverage','artifacts','qa'].includes(part))});
  }
  await cp(path.join(root,'.gitattributes'),path.join(destination,'.gitattributes'));
  if (install) for (const app of ['admin','website']) await run('npm',['ci','--cache',path.join(localRoot,'npm-cache')],path.join(destination,'related',app));
  await writeFile(path.join(destination,'.owned-lumiq-runtime'),'synthetic local only\n');
}

export function countFixtureBackups(names) {return names.filter(name=>/^c[0-9]+_/.test(name)).length;}
export function validateTestBoundary({previewExists,records,publishedMatches,backups}) {
 if(previewExists || records!==0 || !publishedMatches || backups!==0) throw Error('Verification refused: this database is not an empty disposable fixture boundary. Keep the delivered preview and user edits; use a fresh isolated local Docker environment. No automatic reset is performed.');
}
export async function assertTestBoundary(env=localEnvironment()) {
 let previewExists=false;try{await readFile(path.join(localRoot,'preview-config.json'));previewExists=true;}catch{}
 const sql=query=>execFileSync('docker',['exec','-i','supabase_db_lumiq-platform','psql','-U','postgres','-d','postgres','-At','-v','ON_ERROR_STOP=1'],{env,input:query,encoding:'utf8'}).trim();
 const records=Number(sql('select (select count(*) from auth.users)+(select count(*) from public.profiles)+(select count(*) from public.waitlist_signups)+(select count(*) from public.customer_orders)+(select count(*) from public.customer_notes);'));
 const seed=(await readFile(path.join(root,'related/admin/features/content/initial-snapshot.json'),'utf8')).replaceAll("'","''");
 const publishedMatches=sql(`select not exists(select 1 from public.content_publication p join public.content_releases r on r.id=p.release_id where r.snapshot <> '${seed}'::jsonb);`)==='t';
 const backups=countFixtureBackups(sql("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relkind='r';").split("\n"));
 validateTestBoundary({previewExists,records,publishedMatches,backups});
}
