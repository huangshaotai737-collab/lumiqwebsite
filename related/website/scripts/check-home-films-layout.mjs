import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({channel:'chrome',headless:true});
try {
  const p=await b.newPage({viewport:{width:1600,height:1100}});
  const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:4211/en');
  await p.locator('.lh-glass-products canvas').waitFor();
  await p.locator('#films').scrollIntoViewIfNeeded(); await p.waitForTimeout(2200);
  assert.equal(await p.locator('.lh-film-copy').count(),0);
  assert.equal(await p.locator('.lh-film-preview').count(),2);
  for (const side of await p.locator('.lh-film-preview').all()) assert.equal(await side.evaluate(e=>getComputedStyle(e).opacity),'0.45');
  const video=p.locator('.lh-films video');
  assert.equal(await video.evaluate(e=>e.controls),false);
  await video.evaluate(e=>{e.muted=true;});
  await p.getByRole('button',{name:'Play film',exact:true}).click();
  await p.waitForFunction(()=>!document.querySelector('.lh-films video').paused);
  await p.getByRole('button',{name:'Pause film',exact:true}).focus();
  await p.keyboard.press('Enter');
  assert.equal(await video.evaluate(e=>e.paused),true);
  const old=await video.elementHandle();
  await p.locator('.lh-film-preview-right').click();
  assert.match(await p.locator('.lh-films source').getAttribute('src'),/worlds-together/);
  assert.equal(await old.evaluate(e=>e.paused),true);
  const bg=p.locator('.lh-fixed-backgrounds');
  assert.equal(await bg.evaluate(e=>getComputedStyle(e).position),'fixed');
  const layers=p.locator('[data-chapter-background]');
  assert.equal(await layers.count(),6);
  const images=await layers.evaluateAll(es=>es.map(e=>e.style.backgroundImage));
  assert.equal(new Set(images).size,6);
  for (const id of ['products','films','experiences','safety','family','join']) {
    await p.locator('#'+id).scrollIntoViewIfNeeded();await p.waitForTimeout(700);
    const rect=await bg.boundingBox();
    assert.deepEqual(rect,{x:0,y:0,width:1600,height:1100});
    await p.waitForFunction(id=>Number(document.querySelector('[data-chapter-background="'+id+'"]').style.opacity) > .99,id);
  }
  // During a boundary crossing, both full-viewport images coexist without moving edges.
  await p.locator('#films').evaluate(e=>window.scrollTo({top:scrollY+e.getBoundingClientRect().top-innerHeight*.5,behavior:'instant'}));
  await p.waitForTimeout(200);
  const blend=Number(await p.locator('[data-chapter-background="films"]').evaluate(e=>e.style.opacity));
  assert.ok(blend>0 && blend<1);
  assert.deepEqual(await bg.boundingBox(),{x:0,y:0,width:1600,height:1100});
  await p.screenshot({path:'/tmp/chapter-boundary.png'});
  await p.locator('#films').scrollIntoViewIfNeeded();await p.waitForTimeout(700);
  await p.mouse.move(20,100);await p.screenshot({path:'/tmp/films-final-pearl.png'});
  await p.locator('#experiences').scrollIntoViewIfNeeded();await p.waitForTimeout(700);await p.screenshot({path:'/tmp/room-final-pearl.png'});
  await p.setViewportSize({width:390,height:844});await p.locator('#films').scrollIntoViewIfNeeded();await p.waitForTimeout(700);
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.screenshot({path:'/tmp/films-mobile-pearl.png'});
  assert.deepEqual(errors,[]);
  console.log('Films: side previews, controls without timeline, playback/pause/switch, independent fixed chapter backgrounds and seamless crossfade and mobile width passed.');
}finally{await b.close();}
