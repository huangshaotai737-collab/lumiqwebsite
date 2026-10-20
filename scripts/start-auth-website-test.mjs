import {spawn} from 'node:child_process';
import path from 'node:path';
import {cp,mkdir,symlink,rm} from 'node:fs/promises';
import {root,localRoot,localEnvironment} from './platform/local.mjs';
const port=process.env.LUMIQ_WEBSITE_TEST_PORT || '4254';
if (!/^42\d\d$/.test(port)) throw Error('Local test port required');
const source=path.join(root,'related/website'),runtime=path.join(localRoot,'tests',`website-${port}`);
await rm(runtime,{recursive:true,force:true});await mkdir(runtime,{recursive:true});
await cp(source,runtime,{recursive:true,filter:file=>!path.relative(source,file).split(path.sep).some(part=>part==='node_modules'||part==='public'||part.startsWith('.next')||part.startsWith('.env')||['test-results','playwright-report','coverage','artifacts','qa'].includes(part))});
await symlink(path.join(source,'node_modules'),path.join(runtime,'node_modules'));
await symlink(path.join(source,'public'),path.join(runtime,'public'));
// A separate dist directory isolates concurrent preview builds without copying TS config or dependencies.
const env={...localEnvironment(),LUMIQ_NEXT_DIST_DIR:'.next-test',LUMIQ_STATIC_IMAGES:'1'};
const child=spawn(process.execPath,[path.join(source,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',port],{cwd:runtime,env,stdio:'inherit'});
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>child.kill(signal));
child.on('exit',code=>process.exit(code??1));
