import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// Exercises native Safari, not a WebKit emulator. Keep the driver user-enabled.
const base = process.env.SITE_URL || 'http://localhost:4224';
const driver = process.env.SAFARI_DRIVER || 'http://localhost:9235';
const session = process.env.SAFARI_SESSION;
if (!session) throw Error('Pass the active SAFARI_SESSION from safaridriver.');
const output = process.env.QA_OUTPUT || '/private/tmp/lumiq-safari-motion';
await fs.mkdir(output, {recursive: true});
async function command(path, body, method = 'POST') {
  const response = await fetch(`${driver}/session/${session}/${path}`, {
    method, headers: {'Content-Type': 'application/json'},
    ...(method === 'GET' ? {} : {body: JSON.stringify(body)}),
  });
  const {value} = await response.json();
  if (value?.error) throw Error(`${value.error}: ${value.message}`);
  return value;
}
const js = (script, args = []) => command('execute/sync', {script, args});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(script, message, timeout = 20000) {
  const end = Date.now() + timeout;
  do {
    if (await js(script)) return;
    await sleep(100);
  } while (Date.now() < end);
  throw Error(message);
}
const checks = [], failures = [];
async function check(name, work) {
  try { const evidence = await work(); checks.push({name, evidence}); console.log(`PASS ${name}`, evidence); }
  catch (error) { failures.push({name, error: error.message}); console.log(`FAIL ${name}: ${error.message}`); }
}
await command('window/rect', {width:1440, height:1000});
await command('url', {url: `${base}/zh-hant`});
await until("return document.querySelector('.lh-home') && document.querySelector('#products[data-glass-3d]')", 'Homepage/carousel did not hydrate');
await check('product canvas and stories keep the shared full section gap', async () => {
  const evidence = await js(`
    const product=document.querySelector('.lh-glass-products').getBoundingClientRect();
    const films=document.querySelector('.lh-films').getBoundingClientRect();
    const expected=parseFloat(getComputedStyle(document.querySelector('.lumiq-root')).getPropertyValue('--lq-section-gap'));
    return {gap:films.top-product.bottom,expected,width:innerWidth,height:innerHeight};`);
  assert.ok(evidence.gap >= evidence.expected - 1, JSON.stringify(evidence));
  return evidence;
});
await check('scroll entry has visible whole-text motion without changing font metrics', async () => {
  await js(`
    window.__textMotion=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
      if(this.id==='films-title') window.__textMotion.push({frames,options});
      return original.call(this,frames,options);
    };
    window.__beforeText=document.querySelector('#films-title').textContent;
    window.__beforeFont=getComputedStyle(document.querySelector('#films-title')).letterSpacing;
    const title=document.querySelector('#films-title');
    window.scrollTo({top:scrollY+title.getBoundingClientRect().top-innerHeight*.70,behavior:'instant'});`);
  await until('return window.__textMotion.length>0', 'The heading did not animate after entering view');
  const motion = await js('return window.__textMotion[0]');
  assert.ok(motion.options.duration >= 500, `Entry was only ${motion.options.duration}ms`);
  assert.ok(motion.frames.some(frame => frame.transform && frame.transform !== 'translateY(0px)'), 'No upward entrance motion');
  await sleep(1000);
  assert.equal(await js("return document.querySelector('#films-title').textContent===window.__beforeText && getComputedStyle(document.querySelector('#films-title')).letterSpacing===window.__beforeFont && !document.querySelector('#films-title .scroll-word')"), true);
  return motion;
});
await check('Safari girl walks using a transparent video rather than a translated still', async () => {
  await js("document.querySelector('.lh-films-stage').scrollIntoView({block:'center',behavior:'instant'});");
  await until("return document.querySelector('.lh-film-character video')?.currentTime>.5", 'Safari still uses a PNG instead of playing the walking clip');
  const evidence = await js(`
    const video=document.querySelector('.lh-film-character video');
    const canvas=document.createElement('canvas');canvas.width=192;canvas.height=108;
    const ctx=canvas.getContext('2d');ctx.drawImage(video,0,0,192,108);
    return {src:video.currentSrc,time:video.currentTime,paused:video.paused,muted:video.muted,
      alpha:ctx.getImageData(0,0,1,1).data[3],edge:video.parentElement.getBoundingClientRect().left};`);
  assert.ok(evidence.src.endsWith('-safari.mov'), evidence.src);
  assert.equal(evidence.alpha, 0, 'Decoded Safari background must be transparent');
  assert.equal(evidence.muted, true);
  assert.equal(evidence.edge, 0);
  const screenshot=await command('screenshot', undefined, 'GET');
  await fs.writeFile(`${output}/native-safari-stories.png`,Buffer.from(screenshot,'base64'));
  return evidence;
});
await check('partial scroll out does not rewind the character mid-walk', async () => {
  const before = await js("return document.querySelector('.lh-film-character video')?.currentTime ?? -1");
  assert.ok(before > .5, 'Walking video was not running');
  await js(`const stage=document.querySelector('.lh-films-stage');
    window.scrollTo({top:scrollY+stage.getBoundingClientRect().top+stage.clientHeight-innerHeight*.22,behavior:'instant'});`);
  await sleep(200);
  const after = await js("return document.querySelector('.lh-film-character video').currentTime");
  assert.ok(after >= before - .1, `${before} → ${after}`);
  return {before,after};
});
await check('full exit resets the entrance and coming back resumes correctly', async () => {
  await js("window.scrollTo({top:0,behavior:'instant'})");
  await until("const v=document.querySelector('.lh-film-character video');return v.paused && v.currentTime===0", 'Full exit failed to reset the clip');
  await js("document.querySelector('.lh-films-stage').scrollIntoView({block:'center',behavior:'instant'})");
  await until("return document.querySelector('.lh-film-character video').currentTime>.5", 'Returning to stories did not replay');
  return {replayed:true};
});
await check('three languages and normal, short and ultrawide desktop widths keep the gap', async () => {
  const evidence=[];
  for (const locale of ['en','zh-hant','ja']) {
    await command('url',{url:`${base}/${locale}`});
    await until("return document.querySelector('#products[data-glass-3d]')", 'Carousel failed to hydrate');
    for (const size of [{width:1280,height:720},{width:1440,height:1000},{width:2509,height:1148},{width:3440,height:1440},{width:2435,height:498}]) {
      await command('window/rect',size); await sleep(120);
      const state=await js(`
        const canvas=document.querySelector('.lh-glass-products').getBoundingClientRect();
        const films=document.querySelector('.lh-films').getBoundingClientRect();
        const root=document.querySelector('.lumiq-root');
        return {gap:films.top-canvas.bottom,expected:parseFloat(getComputedStyle(root).getPropertyValue('--lq-section-gap')),
          width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth+1};`);
      assert.ok(state.gap>=state.expected-1,`${locale} ${JSON.stringify(state)}`);
      assert.equal(state.overflow,false,`${locale} ${JSON.stringify(state)}`);
      evidence.push({locale,...state});
    }
  }
  return evidence;
});
await command('window/rect',{width:1440,height:1000});
await check('client-side product navigation retains the next section entrance', async () => {
  await command('url',{url:`${base}/zh-hant/products`});
  await until("return document.querySelector('a[href$=\"/products/tablet\"]')", 'Products navigation is missing');
  await js("document.querySelector('a[href$=\"/products/tablet\"]').click()");
  await until("return location.pathname.endsWith('/products/tablet') && document.querySelector('.pd-story-copy h2')", 'Client navigation failed');
  await js(`
    window.__detailMotion=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
      if(this.matches('.pd-story-copy h2')) window.__detailMotion.push({frames,options});
      return original.call(this,frames,options);
    };
    document.querySelector('.pd-story-copy h2').scrollIntoView({block:'center',behavior:'instant'});`);
  await until('return window.__detailMotion.length>0', 'Next route section had no entry animation');
  return await js('return window.__detailMotion[0]');
});
await fs.writeFile(`${output}/report.json`, JSON.stringify({base,checks,failures}, null, 2));
assert.deepEqual(failures, []);
