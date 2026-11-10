import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sources=JSON.parse(await fs.readFile(path.join(root,'lib/responsive-image-sources.json'),'utf8'));
const manifest={};
await fs.mkdir(path.join(root,'public/assets/responsive'),{recursive:true});
for(const src of sources){
 const file=path.join(root,'public',src), bytes=await fs.readFile(file);
 const meta=await sharp(bytes).metadata();
 const hash=crypto.createHash('sha256').update(bytes).update('webp-q86-v1').digest('hex').slice(0,12);
 const base=`/assets/responsive/${path.parse(src).name}-${hash}`;
 const max=Math.min(meta.width,2560);
 const widths=[480,768,1200,1600,1920,2560].filter(w=>w<max).concat(max);
 for(const width of widths)await sharp(bytes).rotate().resize({width,withoutEnlargement:true}).webp({quality:86,alphaQuality:100,effort:5}).toFile(path.join(root,'public',`${base}-${width}.webp`));
 manifest[src]={base,widths};
}
await fs.writeFile(path.join(root,'lib/responsive-image-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated responsive copies for ${sources.length} original images.`);
