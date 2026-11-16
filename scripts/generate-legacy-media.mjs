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
const products={};
for(const [id,product] of Object.entries(snapshot.products)) {
 const slotId=Object.keys(mapping).find(key=>mapping[key].url===product.image);
 if(!slotId || mapping[slotId].kind!=='image')throw Error(`Product image has no trusted slot: ${id}`);
 products[id]={url:product.image,slotId};
}
const expected=`// Generated from the preserved initial snapshot and media profiles by scripts/generate-legacy-media.mjs.\nexport const trustedLegacyMedia: Readonly<Record<string,{url:string;kind:string;profile:string;readOnly:boolean}>> = ${JSON.stringify(mapping,null,2)};\nexport const trustedProductImages: Readonly<Record<string,{url:string;slotId:string}>> = ${JSON.stringify(products,null,2)};\n`;
const target=new URL('contracts/content-legacy-media.ts',root);
if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==expected)throw Error('Legacy mapping drift');}
else await writeFile(target,expected);
console.log('Trusted legacy media mapping verified.');
