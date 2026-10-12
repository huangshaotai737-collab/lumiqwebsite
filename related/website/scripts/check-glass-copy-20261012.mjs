import { chromium, firefox, webkit } from '@playwright/test';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const results=[];
for (const [name,type] of Object.entries({chromium,firefox,webkit})) {
 const b=await type.launch(); const p=await b.newPage({viewport:{width:2382,height:974},reducedMotion:'reduce'});
 await p.goto('http://localhost:4222/zh-hant#products');
 await p.locator('.lh-products-stage').scrollIntoViewIfNeeded();
 await p.waitForTimeout(2200);
 for(let i=0;i<5;i++) {
  const active=p.locator('.glass-sample-content[data-active="true"]');
  await active.waitFor();
  const title=active.locator('[data-card-title]');
  const metrics=await active.evaluate(el=>{
   const t=el.querySelector('[data-card-title]'),d=el.querySelector('p'),c=el.querySelector('[data-card-copy]');
   const tr=t.getBoundingClientRect(),cr=c.getBoundingClientRect();
   return {title:t.textContent,centerError:Math.abs(tr.x+tr.width/2-cr.x-cr.width/2),align:getComputedStyle(d).textAlign,bodyFits:d.scrollWidth<=d.clientWidth+1};
  });
  assert(metrics.centerError<1);assert.equal(metrics.align,'left');assert(metrics.bodyFits);
  const box=await title.boundingBox();
  const {data}=await sharp(await p.screenshot({clip:box})).removeAlpha().raw().toBuffer({resolveWithObject:true});
  let dark=0;for(let n=0;n<data.length;n+=3)if(data[n]<80&&data[n+1]<90&&data[n+2]<105)dark++;
  assert(dark>20,`${name} invisible title ${metrics.title}`);
  results.push({engine:name,...metrics,paintedDarkPixels:dark});
  if(i===0)await p.screenshot({path:`qa/slate-safari-20261012/${name}-cards-final.png`});
  await p.locator('.glass-sample-content[data-offset="1"] .glass-product-hit').click({force:true});
  await p.waitForTimeout(500);
 }
 await b.close();
}
await writeFile('qa/slate-safari-20261012/card-checks.json',JSON.stringify(results,null,2));
console.log(`PASS ${results.length} rendered card titles, centered names, left-aligned descriptions`);
