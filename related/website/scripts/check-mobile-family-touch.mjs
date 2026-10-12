import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const b=await chromium.launch({channel:'chrome',headless:true});
try{
 const p=await b.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 await p.goto(`${process.env.BASE_URL||'http://127.0.0.1:4211'}/en`);
 await p.waitForSelector('.lh-home[data-home-state="open"]',{timeout:60000});
 await p.locator('#films').scrollIntoViewIfNeeded();await p.waitForTimeout(500);
 assert.equal(await p.locator('.lh-film-character').isVisible(),false);
 assert(await p.locator('.lh-film-character').evaluate(v=>v.paused));
 const film=await p.locator('.lh-film-card').boundingBox();assert(Math.abs(film.x+film.width/2-195)<2);
 await p.locator('.lh-family-stage').scrollIntoViewIfNeeded();await p.waitForTimeout(500);
 const cdp=await p.context().newCDPSession(p);
 const swipe=async(dx,dy)=>{
  const rect=await p.locator('.lh-family-stage').boundingBox();const x=195,y=Math.min(650,Math.max(180,rect.y+rect.height/2));
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
  for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y:y+dy*i/8}]});await p.waitForTimeout(20);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(900);
 };
 const cards=p.locator('.lh-family-chapters');const initial=Number(await cards.getAttribute('data-active-family'));
 await swipe(-120,0);assert.equal(Number(await cards.getAttribute('data-active-family')),(initial+1)%3,'finger left switches next');
 await swipe(120,0);assert.equal(Number(await cards.getAttribute('data-active-family')),initial,'finger right switches back');
 const y=await p.evaluate(()=>scrollY);await swipe(0,-130);assert.equal(Number(await cards.getAttribute('data-active-family')),initial,'vertical swipe does not switch images');assert(await p.evaluate(()=>scrollY)>y+50,'vertical page scroll remains free');
 assert.equal(await p.locator('.lh-family-anchor').getAttribute('data-wheel-locked'),null);
 console.log('PASS mobile video centered/character hidden, real touch left/right, free vertical scroll');
}finally{await b.close();}
