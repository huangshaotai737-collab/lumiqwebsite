import { cp, mkdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../',import.meta.url));
const source = path.join(root,'related/website');
const port = process.env.LUMIQ_WEBSITE_TEST_PORT || '4254';
const runtime = path.join(root,'.superpowers/sdd/2026-10-20-lumiq-admin-platform/a3-website-runtime'+(port==='4254'?'':'-'+port));
await rm(runtime,{recursive:true,force:true});
await mkdir(runtime,{recursive:true});
await cp(source,runtime,{recursive:true,filter:(file)=> {
  const relative = path.relative(source,file);
  return !relative.split(path.sep).some(part=>part==='node_modules' || part==='public' || part.startsWith('.next') || part.startsWith('.env') || ['test-results','playwright-report','artifacts','coverage'].includes(part));
}});
await symlink(path.join(source,'node_modules'),path.join(runtime,'node_modules'));
await symlink(path.join(source,'public'),path.join(runtime,'public'));
const child = spawn(process.execPath,[path.join(source,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',port],{cwd:runtime,env:{...process.env,LUMIQ_NEXT_DIST_DIR:'.next-a3-auth',LUMIQ_STATIC_IMAGES:'1'},stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code || 0));
