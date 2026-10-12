// 将 LibTV 光效与已有产品无损叠合，产品本身不重新生成。
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const root = fileURLToPath(new URL('../../../', import.meta.url));
const assets = path.join(root,'related/website/public/assets');
const out = path.join(assets,'home-premium-20260907');
await fs.mkdir(out,{recursive:true});
const source = path.join(root,'output/libtv/premium-refinement-2026-09-07/halo/高级产品柔光环4K20260907.png');
const meta = await sharp(source).metadata();
const size=960;
const {data,info}=await sharp(source).extract({left:Math.round((meta.width-meta.height)/2),top:0,width:meta.height,height:meta.height}).resize(size,size).removeAlpha().raw().toBuffer({resolveWithObject:true});
const rgba=Buffer.alloc(size*size*4);
for(let i=0;i<size*size;i++) {
  const r=data[i*info.channels],g=data[i*info.channels+1],b=data[i*info.channels+2];
  const peak=Math.max(r,g,b);
  rgba[i*4]=peak ? Math.round(240+r/peak*15):255;
  rgba[i*4+1]=peak ? Math.round(244+g/peak*11):255;
  rgba[i*4+2]=255;
  rgba[i*4+3]=Math.max(0,Math.round((peak-5)*.95));
}
const halo=await sharp(rgba,{raw:{width:size,height:size,channels:4}}).png().toBuffer();
const products=[
 ['tablet','home-products-refined-20260907/tablet-pair.webp',560,540],
 ['ola','home-products-refined-20260907/ola-repaired.webp',460,590],
 ['ola-go','home-interactive/go.webp',510,510],
 ['nest','home-products-20260907/nest15-angle-confirmed.webp',570,500],
 ['print','home-interactive/print.webp',440,525],
];
for(const [id,file,width,height] of products) {
 const product=await sharp(path.join(assets,file)).trim().resize(width,height,{fit:'inside'}).png().toBuffer();
 const p=await sharp(product).metadata();
 await sharp(halo).composite([{input:product,left:Math.round((size-p.width)/2),top:Math.round((size-p.height)/2)}]).webp({quality:96,alphaQuality:100}).toFile(path.join(out,`${id}-halo.webp`));
 console.log(`${id}: ${size}×${size}`);
}
