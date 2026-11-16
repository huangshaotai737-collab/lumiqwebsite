const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium,webkit}=require(path.resolve('related/website/node_modules/@playwright/test'));
const base=process.env.AUDIT_BASE||'http://localhost:4263';
const remote=base.startsWith('https');
const evidence=path.resolve('qa/reports/2026-11-03/scene-viewer-evidence');
fs.mkdirSync(evidence,{recursive:true});
const expected={ola:4,'ola-go':6,tablet:8,print:2,nest:5};
async function decode(locator){await locator.locator('img').evaluateAll(xs=>Promise.all(xs.filter(x=>x.getBoundingClientRect().height>0).map(x=>x.decode())));}
(async()=>{
 const results=[],errors=[];
 for(const engine of remote?[chromium]:[chromium,webkit]){
  const browser=await engine.launch();
  const page=await browser.newPage({viewport:{width:1440,height:1000},...(remote&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
  page.on('pageerror',e=>errors.push(e.message));
  for(const locale of engine===chromium&&!remote?['zh-hant','en','ja']:['zh-hant']){
   const allPhotos=[];
   for(const product of Object.keys(expected)){
    const res=await page.goto(`${base}/${locale}/products/${product}`,{waitUntil:'domcontentloaded'});assert.equal(res.status(),200);
    await page.locator('.product-scene-image').first().waitFor();
    assert.equal(await page.locator('.product-scene-image').count(),expected[product],`${product} inline scene count`);
    assert.equal(await page.locator('.product-scene-detail').count(),0,'Modal images must not mount before opening');
    assert.equal(await page.locator('.orb-hero .product-scene-expand,.pd-hero .product-scene-expand').count(),0);
    const sections=await page.locator('.pd-feature-section').evaluateAll(xs=>xs.map(x=>({id:x.id,count:x.querySelectorAll('.pd-feature-row').length})));
    assert(sections.every(s=>s.count>=3&&s.count<=5));
    const photos=await page.locator('.product-scene-image img:not(.orb-scene-edit-target)').evaluateAll(xs=>xs.map(x=>x.getAttribute('src')));
    assert.equal(photos.length,expected[product]);allPhotos.push(...photos);
    const sizes=locale==='zh-hant'&&!remote?[{width:1440,height:1000},{width:390,height:844},{width:2560,height:640}]:[{width:1440,height:1000}];
    for(const size of sizes){
     await page.setViewportSize(size);
     const figures=await page.locator('.product-scene-figure').all();
     for(let i=0;i<figures.length;i++){
      const figure=figures[i];await figure.scrollIntoViewIfNeeded();await decode(figure);
      const geometry=await figure.evaluate(f=>{const i=f.querySelector('.product-scene-image').getBoundingClientRect(),c=f.querySelector('figcaption').getBoundingClientRect();return{ratio:i.width/i.height,gap:c.top-i.bottom,width:i.width}});
      assert(Math.abs(geometry.ratio-4/3)<0.01,`${product} image ratio ${geometry.ratio}`);
      assert(geometry.gap>=0&&geometry.gap<=12,`${product} caption gap ${geometry.gap}`);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${product} overflow ${size.width}`);
      if(locale==='zh-hant'&&size.width===1440&&engine===chromium)await figure.screenshot({path:path.join(evidence,`${remote?'public-':''}${product}-${i+1}.png`)});
     }
     if(locale==='zh-hant'&&size.width===390){const first=page.locator('.product-scene-expand').first();await first.click();await decode(page.locator('dialog[open]'));if(product==='nest')await page.screenshot({path:path.join(evidence,`${remote?'public':engine.name()}-orb-dialog-mobile.png`)});await page.locator('dialog[open] header button').click();await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&document.body.style.overflow!=='hidden');}
     if(locale==='zh-hant'&&product==='nest')await page.locator('#orb-chores').screenshot({path:path.join(evidence,`${remote?'public':engine.name()}-orb-chores-${size.width}.png`)});
    }
    await page.setViewportSize({width:1440,height:1000});
    let dialogs=0,detailImages=0;
    for(const figure of await page.locator('.product-scene-figure').all()){
     const trigger=figure.locator('.product-scene-expand');await trigger.click();const dialog=page.locator('dialog[open]');await dialog.waitFor();await decode(dialog);
     assert.equal(await page.evaluate(()=>document.body.style.overflow),'hidden');
     assert.equal(await dialog.locator('.product-scene-detail').count(),1);detailImages++;if(product==='nest'&&locale==='zh-hant'&&dialogs===3)await page.screenshot({path:path.join(evidence,`${remote?'public':engine.name()}-orb-dialog-desktop.png`)});
     const next=dialog.locator('.product-scene-pagination button').last();
     while(await next.count()&&await next.isEnabled()){await next.click();await decode(dialog);detailImages++;}
     if(await next.count()){const prev=dialog.locator('.product-scene-pagination button').first();while(await prev.isEnabled())await prev.click();assert(await prev.isDisabled());}
     await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
     assert(await trigger.evaluate(x=>x===document.activeElement));
     await page.waitForFunction(()=>document.body.style.overflow!=='hidden');dialogs++;
    }
    // The photograph is also a trigger; explicit close returns focus to it.
    const photoTrigger=page.locator('.product-scene-image').first();await photoTrigger.click();await page.locator('dialog[open] header button').click();assert(await photoTrigger.evaluate(x=>x===document.activeElement));
    if(product==='nest'){
     assert.equal(await page.locator('.orb-home-gallery').count(),0);
     const pickers=page.locator('.orb-finish-picker button');
     for(let i=0;i<3;i++){await pickers.nth(i).click();const finish=['oak','walnut','black'][i];assert.equal(await pickers.nth(i).getAttribute('aria-pressed'),'true');assert((await page.locator('.orb-finish-product img').getAttribute('src')).includes(`nest15-${finish}-front.webp`));assert((await page.locator('.orb-hero-visual img').getAttribute('src')).includes(`nest15-${finish}-angle.webp`));await decode(page.locator('#orb-finishes'));}
     await page.locator('#orb-finishes').screenshot({path:path.join(evidence,`${remote?'public':engine.name()}-orb-finishes.png`)});
    }
    assert(!/MISSING_MESSAGE|BrandSceneDetails\./.test(await page.locator('body').innerText()));
    results.push({engine:engine.name(),locale,product,sections,photos,dialogs,detailImages,viewports:sizes});
    console.log('PASS',engine.name(),locale,product,dialogs,detailImages);
   }
   assert.equal(new Set(allPhotos).size,allPhotos.length,`${engine.name()} ${locale}: repeated photos across products`);
  }
  await browser.close();
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(evidence,remote?'public-results.json':'local-results.json'),JSON.stringify({base,results,errors},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
