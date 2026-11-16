import path from 'node:path';
import {spawn} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {localRoot,captureLocal,prepareMirror,assertTestBoundary} from './local.mjs';
const {env}=await captureLocal(),mirror=path.join(localRoot,'verification'),evidence=path.join(localRoot,'evidence');
await assertTestBoundary(env);
await prepareMirror(mirror,{install:false});await mkdir(evidence,{recursive:true});
const cases=[
 ['missing-product','website','test:e2e:platform','five-card fault counterexample','toHaveCount'],
 ['unauthorized-success','admin','test:e2e','permission-response counterexample','Expected: 401'],
 ['fake-save','website','test:e2e:account','profile save persists','C7 durable saved name'],
];
for(const [fault,app,script,grep,expected] of cases){
 const args=['run',script,'--','--grep',grep];if(app==='website')args.push('--project','desktop');
 let output='';const code=await new Promise((resolve,reject)=>{const child=spawn('npm',args,{cwd:path.join(mirror,'related',app),env:{...env,LUMIQ_REGRESSION_FAULT:fault,LUMIQ_PLATFORM_SUITE:'auth'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk);child.on('error',reject);child.on('exit',resolve);});
 await writeFile(path.join(evidence,`counterexample-${fault}.log`),output);
 if(code===0 || !output.includes(expected) || !output.includes('1 failed') || (fault==='missing-product'&&!output.includes('INJECTED missing-product')))throw Error(`Counterexample ${fault} did not produce the expected assertion failure`);
 console.log(`PASS counterexample ${fault}: injected defect rejected (exit ${code})`);
}
