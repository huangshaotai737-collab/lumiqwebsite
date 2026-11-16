import {it,expect} from 'vitest';
import {spawnSync} from 'node:child_process';
it('keeps private client preview markup synchronized with the public server source',()=>{
 const result=spawnSync(process.execPath,['scripts/generate-visual-preview.mjs','--check'],{encoding:'utf8'});
 expect(result.status,result.stderr).toBe(0);
});
