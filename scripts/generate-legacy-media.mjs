import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const profiles=JSON.parse(await readFile(new URL('related/admin/features/media/profiles.json',root),'utf8'));
const snapshot=JSON.parse(await readFile(new URL('related/admin/features/content/initial-snapshot.json',root),'utf8'));
const mapping={};
for(const [key,slot] of Object.entries(snapshot.media)){
 const policy=profiles[key];
 if(!policy || policy.legacyUrl!==slot.url || policy.kind!==slot.kind || policy.profile!==slot.profile)throw Error(`Legacy provenance mismatch: ${key}`);
 mapping[key]={url:slot.url,kind:slot.kind,profile:slot.profile,readOnly:Boolean(policy.readOnlyReason)};
}
const expected=`// Generated from the preserved initial snapshot and media profiles by scripts/generate-legacy-media.mjs.\nexport const trustedLegacyMedia: Readonly<Record<string,{url:string;kind:string;profile:string;readOnly:boolean}>> = ${JSON.stringify(mapping,null,2)};\n`;
const target=new URL('contracts/content-legacy-media.ts',root);
if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==expected)throw Error('Legacy mapping drift');}
else await writeFile(target,expected);
console.log('Trusted legacy media mapping verified.');
