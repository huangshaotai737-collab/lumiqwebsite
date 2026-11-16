const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('../../../../related/website/node_modules/@playwright/test');
const base=process.env.AUDIT_BASE||'http://127.0.0.1:4264';
const evidence=__dirname, remote=base.startsWith('https');
const expected={ola:4,'ola-go':6,tablet:8,print:2,nest:5};
function source(src){const url=new URL(src,base);return url.pathname==='/_next/image'?url.searchParams.get('url'):src;}
async function decode(locator){await locator.locator('img').evaluateAll(xs=>Promise.all(xs.filter(x=>x.getBoundingClientRect().height>0).map(x=>x.decode())));}
(async()=>{
 const results=[],errors=[];
 for(const engine of remote?[chromium]:[chromium,webkit]){
  const browser=await engine.launch();
  const page=await browser.newPage({viewport:{width:1440,height:1000},...(remote&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
  page.on('pageerror',e=>errors.push(e.message));
  const allPhotos=[];
  for(const product of Object.keys(expected)){
   const res=await page.goto(`${base}/zh-hant/products/${product}`,{waitUntil:'domcontentloaded'});assert.equal(res.status(),200);
   // This suite verifies ready-page interactions; remote JS must finish loading
   // before clicking SSR buttons. Cold-load interaction timing is recorded separately.
   if(remote) await page.waitForLoadState('networkidle',{timeout:90000});
   await page.locator('.product-scene-image').first().waitFor();
   assert.equal(await page.locator('.product-scene-expand').count(),expected[product]);
   assert.equal(await page.locator('.product-focus-viewport').count(),0,'No mounted close-up scene before click');
   assert.equal(await page.locator('.orb-hero .product-scene-expand,.pd-hero .product-scene-expand').count(),0);
   const photos=(await page.locator('.product-scene-image img:not(.orb-scene-edit-target)').evaluateAll(xs=>xs.map(x=>x.getAttribute('src')))).map(source);allPhotos.push(...photos);
   const sections=await page.locator('.pd-feature-section').evaluateAll(xs=>xs.map(x=>({id:x.id,count:x.querySelectorAll('.pd-feature-row').length})));
   assert(sections.every(s=>s.count>=3&&s.count<=5));
   let dialogs=0,views=0;
   for(const size of remote?[{width:1440,height:1000}]:[{width:1440,height:1000},{width:390,height:844},{width:2560,height:640}]){
    await page.setViewportSize(size);
    const figures=await page.locator('.product-scene-figure').all();
    for(let i=0;i<figures.length;i++){
     const figure=figures[i];await figure.scrollIntoViewIfNeeded();await decode(figure);
     const layout=await figure.evaluate(f=>{const a=f.querySelector('.product-scene-image').getBoundingClientRect(),c=f.querySelector('figcaption').getBoundingClientRect();return {ratio:a.width/a.height,gap:c.top-a.bottom}});
     assert(Math.abs(layout.ratio-4/3)<.01);assert(layout.gap>=0&&layout.gap<=12);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page horizontal overflow');
     const trigger=figure.locator('.product-scene-expand');assert.match(await trigger.innerText(),/查看產品特寫/);
     await trigger.click();const dialog=page.locator('dialog[open]');await dialog.waitFor();await decode(dialog);
     assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
     const crop=dialog.locator('.product-focus-viewport');assert.equal(await crop.count(),1);
     const geometry=await crop.evaluate(v=>{const s=v.querySelector('.product-focus-scene'),a=v.getBoundingClientRect(),b=s.getBoundingClientRect();return {x:a.x,y:a.y,w:a.width,h:a.height,sourceWidth:b.width,sourceHeight:b.height,sourceX:b.x,sourceY:b.y,screenW:innerWidth,screenH:innerHeight}});
     assert(geometry.sourceWidth>geometry.w*1.1&&geometry.sourceHeight>geometry.h*1.1,'Must focus on product, not show full photo');
     assert(geometry.x>=0&&geometry.y>=0&&geometry.x+geometry.w<=geometry.screenW+1&&geometry.y+geometry.h<=geometry.screenH+1,'Close-up fits viewport');
     assert(geometry.sourceX<=geometry.x&&geometry.sourceY<=geometry.y&&geometry.sourceX+geometry.sourceWidth>=geometry.x+geometry.w-1&&geometry.sourceY+geometry.sourceHeight>=geometry.y+geometry.h-1,'No empty crop area');
     assert.equal(await crop.locator('img').count(),1,'One scene photo, no separate raw UI image');
     assert.equal(source(await crop.locator('img').getAttribute('src')),photos[i],'Close-up keeps the original lifestyle scene');
     if(product==='nest'){
      assert.equal(await crop.locator('.orb-device-scene svg').count(),1,'UI remains inside the photographed device');
      // Independently measured full device-frame bounds, not merely the screen.
      const bounds=i===4?{x:130,y:106,right:1292,bottom:974}:{x:145,y:390,right:896,bottom:927};
      const b=await crop.locator('.orb-device-scene').boundingBox(),v=await crop.boundingBox();
      assert(b.x+b.width*bounds.x/1448>=v.x-1&&b.y+b.height*bounds.y/1086>=v.y-1&&b.x+b.width*bounds.right/1448<=v.x+v.width+1&&b.y+b.height*bounds.bottom/1086<=v.y+v.height+1,'Entire Orb frame retained');
     }
     views++;
     if(size.width===1440&&engine===chromium&&!remote)await crop.screenshot({path:path.join(evidence,`${product}-${i+1}.png`)});
     if(i===0&&(product==='nest'||product==='ola-go'))await page.screenshot({path:path.join(evidence,`${remote?'public':engine.name()}-${product}-${size.width}.png`)});
     const next=dialog.locator('.product-scene-pagination button').last();
     while(await next.count()&&await next.isEnabled()){
      await next.click();await decode(dialog);assert.equal(await crop.locator('.orb-device-scene svg').count(),1);assert.equal(source(await crop.locator('img').getAttribute('src')),photos[i]);views++;
      if(size.width===1440&&engine===chromium&&!remote)await crop.screenshot({path:path.join(evidence,`${product}-${i+1}-next.png`)});
     }
     if(await next.count()){const prev=dialog.locator('.product-scene-pagination button').first();while(await prev.isEnabled())await prev.click();assert(await prev.isDisabled());}
     await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&document.body.style.overflow!=='hidden');
     assert(await trigger.evaluate(x=>x===document.activeElement));assert.equal(await page.locator('.product-focus-viewport').count(),0);dialogs++;
    }
   }
   // Image trigger and explicit close also work, returning focus without moving the page.
   const photo=page.locator('.product-scene-image').first();await photo.click();await page.locator('dialog[open] header button').click();assert(await photo.evaluate(x=>x===document.activeElement));
   if(product==='nest')for(let i=0;i<3;i++){
    const button=page.locator('.orb-finish-picker button').nth(i);await button.click();const finish=['oak','walnut','black'][i];assert.equal(await button.getAttribute('aria-pressed'),'true');assert((await page.locator('.orb-finish-product img').getAttribute('src')).includes(`nest15-${finish}-front.webp`));assert((await page.locator('.orb-hero-visual img').getAttribute('src')).includes(`nest15-${finish}-angle.webp`));
   }
   results.push({engine:engine.name(),product,photos,sections,dialogs,views});console.log('PASS',engine.name(),product,dialogs,views);
  }
  assert.equal(new Set(allPhotos).size,allPhotos.length,'No duplicate lifestyle photos across products');
  if(!remote&&engine===chromium)for(const locale of ['en','ja']){
   await page.setViewportSize({width:1440,height:1000});await page.goto(`${base}/${locale}/products/nest`);
   const trigger=page.locator('.product-scene-expand').first();assert.match(await trigger.innerText(),locale==='en'?/View product close-up/:/製品のクローズアップ/);await trigger.click();await decode(page.locator('dialog[open]'));await page.keyboard.press('Escape');
  }
  await browser.close();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(evidence,remote?'public-results.json':'local-results.json'),JSON.stringify({base,results,errors},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
