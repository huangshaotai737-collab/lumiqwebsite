import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.SITE_URL || 'http://localhost:4237';
const driver = process.env.SAFARI_DRIVER || 'http://localhost:9236';
const session = process.env.SAFARI_SESSION;
assert(session, 'SAFARI_SESSION is required');
const out = process.env.QA_OUTPUT || '/private/tmp/lumiq-cart-position-native';
await fs.mkdir(out, {recursive: true});
const results = [];
const failures = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function command(path, body, method = 'POST') {
  const response = await fetch(`${driver}/session/${session}/${path}`, {
    method, signal: AbortSignal.timeout(25000), headers: {'Content-Type': 'application/json'},
    ...(method === 'GET' ? {} : {body: JSON.stringify(body)}),
  });
  const {value} = await response.json();
  if (value?.error) throw Error(`${value.error}: ${value.message}`);
  return value;
}
const js = script => command('execute/sync', {script, args: []});
async function wait(script) {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await js(`return (${script})`)) return;
    await sleep(100);
  }
  throw Error(`Condition timed out: ${script}`);
}
const state = () => js(`
  const selectors = ['.site-nav', 'main', '.pd-hero-display-title', '.lh-hero-copy', '.lh-hero-media', '.members-heading'];
  const boxes = Object.fromEntries(selectors.map(selector => {
    const element = document.querySelector(selector);
    const rect = element?.getBoundingClientRect();
    return [selector, rect ? {x:rect.x, y:rect.y, width:rect.width, height:rect.height} : null];
  }));
  const drawer = document.querySelector('#lumiq-cart');
  const rect = drawer?.open ? drawer.getBoundingClientRect() : null;
  return {width:innerWidth, contentWidth:document.documentElement.clientWidth, y:scrollY, boxes, drawer:rect?{left:rect.left,right:rect.right}:null};
`);
function unchanged(before, after, label) {
  assert(Math.abs(after.y - before.y) <= 1, `${label}: scroll moved ${after.y-before.y}px`);
  assert.equal(after.contentWidth, before.contentWidth, `${label}: page content width changed`);
  for (const [selector, box] of Object.entries(before.boxes)) {
    if (!box) continue;
    for (const property of ['x', 'y', 'width']) {
      assert(Math.abs(after.boxes[selector][property] - box[property]) <= 1,
        `${label}: ${selector} ${property} moved ${after.boxes[selector][property]-box[property]}px`);
    }
  }
}
const matrix = (process.env.QUICK === '1')
  ? [{locale:'zh-hant', route:'/products/tablet', width:1440, offset:480}]
  : ['en','zh-hant','ja'].flatMap(locale => ['', '/products/tablet', '/members'].flatMap(route =>
      [500,1043,1440,2435].map(width => ({locale,route,width,offset:route ? 480 : 0}))));
for (const {locale,route,width,offset} of matrix) {
  const name = `${locale}${route}/${width}`;
  let before, opened, closed;
  try {
    const token = `${Date.now()}-${width}`;
    await command('window/rect', {width,height:1000});
    await command('url', {url:`${base}/${locale}${route}?cart-position=${token}`});
    await wait(`new URLSearchParams(location.search).get('cart-position')===${JSON.stringify(token)} && document.fonts.status==='loaded' && document.readyState==='complete' && document.querySelector('.cart-nav-trigger') && !document.querySelector('.cart-nav-trigger').disabled`);
    if (!route) await wait(`document.querySelector('.lh-home')?.dataset.homeState==='open'`);
    await js(`scrollTo({top:${offset},behavior:'instant'});return true`);
    await sleep(700);
    before = await state();
    // Exercise the mounted application's handler; showModal retains native dialog focus.
    // Safari's WebDriver element-click did not deliver a click on this fixed header.
    await js(`document.querySelector('.cart-nav-trigger').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));return true`);
    await wait(`document.querySelector('#lumiq-cart')?.open && document.querySelector('#lumiq-cart').getAnimations().every(a=>a.playState==='finished'||a.playState==='idle')`);
    await sleep(300);
    opened = await state();
    assert(opened.drawer.left>=-1 && Math.abs(opened.drawer.right-opened.width)<=1,
      `${name}: drawer must stay inside and touch the viewport edge: ${JSON.stringify(opened.drawer)}`);
    if(locale==='zh-hant' && route==='/products/tablet' && width===1440) {
      const png = await command('screenshot',undefined,'GET');
      await fs.writeFile(`${out}/safari-cart-position-after.png`,Buffer.from(png,'base64'));
    }
    await js(`document.querySelector('#lumiq-cart .cart-icon-button').dispatchEvent(new MouseEvent('click',{bubbles:true,detail:1}));return true`);
    await wait(`!document.querySelector('#lumiq-cart')?.open`);
    await sleep(300);
    closed = await state();
    unchanged(before, opened, `${name} open`);
    unchanged(before, closed, `${name} close`);
    results.push({name,before,opened,closed});
    console.log(`PASS native cart position ${name}`);
  } catch (error) {
    failures.push({name,error:error.message,before,opened,closed});
    console.log(`FAIL native cart position ${name}: ${error.message}`);
    await js(`document.querySelector('#lumiq-cart .cart-icon-button')?.click();return true`).catch(()=>{});
  }
  await fs.writeFile(`${out}/report.json`,JSON.stringify({base,results,failures},null,2));
}
assert.deepEqual(failures, []);
