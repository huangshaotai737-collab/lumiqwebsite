import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
type Pointer={singleton:boolean;release_id:string|null;updated_at:string};
function sql(query:string){return execFileSync('docker',['exec','-i','supabase_db_lumiq-platform','psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:query,env:process.env,encoding:'utf8'}).trim();}
export function capturePublication(owner:string):Pointer {
 const identity=execFileSync('docker',['inspect','--format','{{index .Config.Labels "com.supabase.cli.project"}}','supabase_db_lumiq-platform'],{encoding:'utf8'}).trim();
 if(identity!=='lumiq-platform')throw Error('Unexpected fixture database');
 const pointer=JSON.parse(sql('select row_to_json(p) from public.content_publication p where singleton;')) as Pointer;
 const folder=path.resolve(__dirname,'../../../../.lumiq-local/evidence/publication-fixtures');mkdirSync(folder,{recursive:true});
 writeFileSync(path.join(folder,`${owner}-${Date.now()}.json`),JSON.stringify(pointer)+'\n',{mode:0o600});return pointer;
}
export function restorePublication(pointer:Pointer|undefined) {
 if(!pointer)return;
 // Restore only the captured pointer. Immutable release and audit evidence remain intact.
 const value=JSON.stringify(pointer).replaceAll("'","''");
 sql(`update public.content_publication p set release_id=b.release_id,updated_at=b.updated_at from json_populate_record(null::public.content_publication,'${value}'::json) b where p.singleton=b.singleton;`);
}
export async function cleanupPublicationOwner(pointer:Pointer|undefined,operations:(()=>Promise<unknown>)[]) {
 const errors:unknown[]=[];try{restorePublication(pointer);}catch(error){errors.push(error);}
 for(const operation of operations)try{await operation();}catch(error){errors.push(error);}
 if(errors.length)throw new AggregateError(errors,'Publication fixture restoration/cleanup failed');
}
