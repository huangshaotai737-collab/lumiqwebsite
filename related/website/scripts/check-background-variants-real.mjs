import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const variants = process.argv.slice(2).map(Number);
if (!variants.length) variants.push(1, 2, 3, 4, 5);
assert(variants.every(v => Number.isInteger(v) && v >= 0 && v <= 5));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
for (const variant of variants) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`http://127.0.0.1:4211/en${variant ? `?background=${variant}` : ""}`);
  await page.waitForSelector('.lh-home[data-home-state="open"]', { timeout: 30000 });
  await page.waitForTimeout(1000);
  const video = page.locator('[data-background-video]');
  await page.waitForSelector('[data-background-video][data-ready="true"]');
  assert((await video.evaluate(v => v.currentSrc)).endsWith(`version-${variant || 5}.mp4`));
  if (!variant) assert.equal(await page.getByRole('navigation', { name: '背景方案预览' }).count(), 0);
  const cues = await video.evaluate(v => JSON.parse(v.dataset.scrollCues));
  assert.deepEqual([...new Set(cues.map(cue => cue[1]))], [0, 5, 10, 15, 20, 25, 30]);
  assert(cues.every(([position], i) => !i || position >= cues[i - 1][0]), 'chapter cues are ordered');
  const move = async (position, expected) => {
    await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), position);
    await page.waitForFunction(time => {
      const v = document.querySelector('[data-background-video]');
      return !v.seeking && Math.abs(v.currentTime - Math.min(time, v.duration - 1 / 30)) < .08;
    }, expected);
    assert(await video.evaluate(v => v.paused), 'scroll drives a paused video');
  };
  for (const [position, time] of cues) await move(position, time);
  const product = cues.filter(([, time]) => time === 5);
  assert(product.length === 2 && product[1][0] > product[0][0], 'product pin has a reading hold');
  await move((product[0][0] + product[1][0]) / 2, 5);
  await move((cues[0][0] + product[0][0]) / 2, 2.5);
  await page.waitForTimeout(250);
  assert(Math.abs(await video.evaluate(v => v.currentTime) - 2.5) < .08, 'stopped scroll freezes the frame');
  for (const [i,name] of ['products','films','experiences','safety','family','join'].entries()) {
    const time=(i+1)*5;
    await move(cues.find(c=>c[1]===time)[0],time);
    await page.waitForTimeout(700);
    await page.screenshot({path:`/tmp/lumiq-real-v${variant}-${name}.png`});
  }
  for (const [position,time] of [...cues].reverse()) await move(position,time);
  await page.evaluate(()=>{window.flickers=0; const v=document.querySelector('[data-background-video]');v.addEventListener('seeking',()=>requestAnimationFrame(()=>{if(v.dataset.ready!=='true'||v.style.opacity!=='1')window.flickers++;}));});
  for(let i=0;i<14;i++) {await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),cues[i%cues.length][0]);await page.waitForTimeout(45);}
  await move(product[0][0],5);
  assert.equal(await page.evaluate(()=>window.flickers),0);
  if (variants.length > 1 && !variants.includes(0)) {
    const next = variants[(variants.indexOf(variant) + 1) % variants.length];
    const before = await page.evaluate(() => scrollY);
    await page.getByRole('button', { name: `背景方案 ${next}`, exact: true }).click();
    await page.waitForFunction(next => {
      const video = document.querySelector('[data-background-video]');
      return video.dataset.ready === 'true' && video.currentSrc.endsWith(`version-${next}.mp4`);
    }, next);
    assert.equal(await page.evaluate(() => scrollY), before, 'switch keeps current page');
    assert.equal(await video.count(), 1, 'page and glass share one video');
  }
  console.log(`PASS real version ${variant}: six screenshots, reverse, freeze, fast scroll and available version switch.`);
  await page.close();
}
} finally { await browser.close(); }
