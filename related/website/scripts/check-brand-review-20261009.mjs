import { chromium, webkit, firefox } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const engine = process.env.ENGINE || 'chromium';
const base = process.env.SITE_URL || 'http://127.0.0.1:4211';
const output = process.env.QA_OUTPUT || 'qa/brand-review-20261009';
await fs.mkdir(output, { recursive: true });
const browser = await ({ chromium, webkit, firefox }[engine]).launch(engine === 'chromium' ? { channel: 'chrome' } : {});
const checks = [], failures = [];
const run = async (name, test) => {
  try { await test(); checks.push({ name, passed: true }); }
  catch (e) { checks.push({ name, passed: false, reason: e.stack }); failures.push(name); }
};
try {
  let page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/zh-hant`, { waitUntil: 'load' });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${output}/${engine}-home-current.png` });
  await run('desktop navigation is readable and includes members before FAQ', async () => {
    const nav = page.locator('.site-desktop-nav');
    assert.equal(await nav.locator('a[href$="/members"]').count(), 1);
    assert.ok(await nav.locator('a').first().evaluate(e => parseFloat(getComputedStyle(e).fontSize)) >= 16);
    const hrefs = await nav.locator('a').evaluateAll(es => es.map(e => e.getAttribute('href')));
    assert.ok(hrefs.findIndex(h => h.endsWith('/members')) < hrefs.findIndex(h => h.endsWith('/faq')));
  });
  await page.locator('#films').scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  await run('WebKit character fallback has a replayable entrance', async () => {
    if (engine !== 'webkit') return;
    const state = await page.locator('.lh-film-character').evaluate(e => ({ visible: e.dataset.visible, animation: getComputedStyle(e.querySelector('img')).animationName }));
    assert.equal(state.visible, 'true');
    assert.notEqual(state.animation, 'none');
    const visiblePixels = await page.locator('.lh-film-character img').evaluate(img => {
      const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
      const box=img.getBoundingClientRect();let visible=0;
      for(let y=0;y<canvas.height;y+=4)for(let x=0;x<canvas.width;x+=4){const screenX=box.x+x/canvas.width*box.width,screenY=box.y+y/canvas.height*box.height;if(pixels[(y*canvas.width+x)*4+3]>128&&screenX>0&&screenX<innerWidth&&screenY>0&&screenY<innerHeight)visible++;}
      return visible;
    });
    assert.ok(visiblePixels > 1000, `character must actually be in the viewport, found ${visiblePixels} opaque samples`);
  });
  await run('home ending never overlaps the footer, including after resizing', async () => {
    for(const viewport of [{width:1440,height:1000},{width:2435,height:498},{width:390,height:844},{width:1440,height:1000}]){
      await page.setViewportSize(viewport);
      await page.waitForTimeout(650);
      for(const edge of ['junction','bottom']){
        await page.evaluate(edge=>{const footer=document.querySelector('.footer');scrollTo({top:edge==='junction'?footer.getBoundingClientRect().top+scrollY-400:document.documentElement.scrollHeight,behavior:'instant'});},edge);
        await page.waitForTimeout(1000);
        const overlap=await page.evaluate(()=>document.querySelector('#join .lh-consent').getBoundingClientRect().bottom>document.querySelector('.footer').getBoundingClientRect().top);
        assert.equal(overlap,false,`join consent overlaps footer at ${viewport.width}x${viewport.height} ${edge}`);
      }
    }
  });
  await page.close();
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${base}/zh-hant/products/ola-go`, { waitUntil: 'load' });
  await page.waitForTimeout(2400);
  await run('Ola Go does not repeat its relationship slogan in the closing CTA', async () => {
    const story = await page.locator('.pd-story-floor h2').textContent();
    const closing = await page.locator('.pd-final-inner h2').textContent();
    assert.notEqual(closing.trim(), story.trim());
  });
  await run('short desktop product hero keeps text blocks separate', async () => {
    await page.setViewportSize({ width: 2435, height: 498 });
    await page.reload({ waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const overlap = await page.evaluate(() => {
      const selectors = ['.pd-hero-display-title', '.pd-product-tagline', '.pd-hero-lede', '.pd-concept-note'];
      const boxes = selectors.map(s => document.querySelector(s)?.getBoundingClientRect()).filter(Boolean);
      return boxes.some((a, i) => boxes.slice(i + 1).some(b => Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)));
    });
    assert.equal(overlap, false);
  });
  await run('members preview saves preferences but never claims a server submission', async () => {
    await page.close();
    page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const response = await page.goto(`${base}/zh-hant/members`, { waitUntil: 'load' });
    assert.equal(response.status(), 200);
    await page.getByRole('button', { name: '查看演示設備' }).click();
    await run('loaded member images never overlap their copy at any width', async () => {
      for(const width of [320,390,768,1100,1280,1440,2435,3440]){
        await page.setViewportSize({width,height:1000});
        await page.locator('.members-device-image img').evaluateAll(es=>Promise.all(es.map(img=>img.decode())));
        const overlap=await page.locator('.members-device').evaluateAll(es=>es.some(e=>{const a=e.querySelector('img').getBoundingClientRect(),b=e.querySelector('.members-device-copy').getBoundingClientRect();return a.bottom>b.top;}));
        assert.equal(overlap,false,`device image overlaps copy at ${width}px`);
      }
      await page.setViewportSize({width:1440,height:1000});
    });
    await page.getByRole('button', { name: '設定 LUMIQ OLA' }).click();
    await page.getByLabel('設備名稱').fill('客廳的 OLA');
    await page.getByRole('button', { name: '儲存設定' }).click();
    await page.reload({ waitUntil: 'load' });
    await page.getByText('客廳的 OLA', { exact: true }).waitFor();
    assert.equal(await page.getByText('客廳的 OLA', { exact: true }).count(), 1);
    await page.getByRole('button', { name: '建議與投訴', exact: true }).click();
    await page.getByLabel('內容').fill('驗收草稿，未提交到品牌。');
    await page.getByRole('button', { name: '儲存草稿' }).click();
    await page.getByRole('status').filter({ hasText: '草稿' }).waitFor();
    assert.equal(await page.getByRole('status').filter({ hasText: '草稿' }).count(), 1);
    assert.equal(await page.getByText('已提交', { exact: true }).count(), 0);
  });
  await page.close();
} finally {
  await browser.close();
  await fs.writeFile(`${output}/${engine}-checks.json`, JSON.stringify({ engine, checks, failures }, null, 2));
}
console.log(JSON.stringify({ engine, checks, failures }, null, 2));
assert.deepEqual(failures, []);
