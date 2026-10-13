import {chromium, firefox, webkit} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const base = process.env.SITE_URL || 'http://localhost:4240';
const output = process.env.QA_OUTPUT || '/private/tmp/lumiq-light-theme';
await fs.mkdir(output, {recursive: true});
const checks = [], failures = [];
let currentStage = '';
const oldMovie = '/assets/background-variants-20260911/version-5-tail-wave-20260914.mp4';
const record = (name, state, ok) => {
  checks.push({name, ...state});
  if (!ok) failures.push({name, ...state});
};
for (const [engine, type] of Object.entries({chromium, firefox, webkit})) {
  const browser = await type.launch();
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    page.setDefaultTimeout(20000);
    for (const locale of ['en', 'zh-hant', 'ja']) {
      for (const route of ['/products/ola', '/products/ola-go', '/products/tablet', '/products/print', '/products/nest', '/members', '/story', '/plans', '/faq', '/prelaunch', '/contact', '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/child-safety']) {
        currentStage = `${locale}${route}`;
        await page.goto(`${base}/${locale}${route}`, {waitUntil: 'domcontentloaded'});
        await page.locator('main,.media-page,.prelaunch-page').first().waitFor();
        await page.evaluate(() => document.fonts.ready);
        const state = await page.evaluate(async () => {
          const main = document.querySelector('main,.media-page,.prelaunch-page');
          const pseudo = getComputedStyle(main, '::before');
          const style = pseudo.content !== 'none' ? pseudo : getComputedStyle(main);
          const heading = main.querySelector('.pd-product-tagline,.members-heading h1,h1');
          const rgb = value => (value.match(/[\d.]+/g) || []).map(Number);
          const bright = c => c.length >= 3 && c.slice(0, 3).reduce((a,b) => a+b, 0) / 3 > 205;
          const dark = c => c.length >= 3 && Math.max(...c.slice(0, 3)) < 150;
          let surface = main;
          let base = rgb(style.backgroundColor);
          while ((base.length < 3 || base.length === 4 && base[3] < .8) && surface.parentElement) {
            surface = surface.parentElement;
            base = rgb(getComputedStyle(surface).backgroundColor);
          }
          // Browser canvas is white if all ancestors are fully transparent.
          let pixelsLight = base.length === 4 && base[3] === 0 || bright(base), image = style.backgroundImage;
          if(image.includes('gradient')) pixelsLight &&= [...image.matchAll(/rgba?\([^\)]+\)/g)].every(([color]) => bright(rgb(color)));
          const url = image.match(/url\("?([^"\)]+)/)?.[1];
          if (url) {
            const img = new Image(); img.src = url; await img.decode();
            const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 18;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, 32, 18);
            const data = ctx.getImageData(0, 0, 32, 18).data;
            let light = 0;
            for (let i = 0; i < data.length; i += 4) if (bright([...data.slice(i, i+3)])) light++;
            pixelsLight = light / (32*18) > .9;
          }
          const panel = document.querySelector('.tier-card.featured,.pal-table thead .is-featured');
          const cart = main.querySelector('.cart-add-button');
          return {image, pixelsLight, headingDark: !heading || dark(rgb(getComputedStyle(heading).color)), cartReadable: !cart || dark(rgb(getComputedStyle(cart).color)), panelLight: !panel || bright(rgb(getComputedStyle(panel).backgroundColor)), overflow: document.documentElement.scrollWidth > innerWidth+1};
        });
        record(`${engine}/${locale}${route}`, state, state.pixelsLight && state.headingDark && state.cartReadable && state.panelLight && !state.overflow && !state.image.includes('slate-backgrounds'));
      }
    }
    currentStage = 'home/open';
    await page.goto(`${base}/zh-hant`, {waitUntil: 'domcontentloaded'});
    await page.waitForFunction(() => document.querySelector('.lh-home')?.dataset.homeState === 'open');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
    currentStage = 'home/video-ready';
    await page.waitForFunction(() => document.querySelector('[data-background-video]')?.dataset.ready === 'true', null, {timeout:60000});
    const movie = await page.locator('[data-background-video]').getAttribute('src');
    record(`${engine}/movie-source`, {movie}, movie === oldMovie);
    const cues = await page.locator('[data-background-video]').getAttribute('data-scroll-cues');
    const times = [...new Set(JSON.parse(cues).map(([,t]) => t))];
    record(`${engine}/chapter-mapping`, {times}, JSON.stringify(times) === JSON.stringify([0,5,10,15,20,25,30]));
    // Literal scroll positions are taken from the independent chapter timelines;
    // reversals must decode the correct light frame and remain scroll-controlled.
    for (const time of [30, 25, 20, 15, 10, 5, 20, 5, 30]) {
      currentStage = `home/seek-${time}`;
      const parsed = JSON.parse(cues);
      const cue = parsed.find(([, t]) => t === time) || parsed.at(-1);
      await page.evaluate(y => scrollTo({top:y,behavior:'instant'}), cue[0]);
      await page.waitForFunction(t => {
        const v = document.querySelector('[data-background-video]');
        return v && !v.seeking && Math.abs(v.currentTime - Math.min(t, v.duration-1/24)) < .15;
      }, time, {timeout:3000}).catch(() => {});
      // currentTime/seeked update before the decoded frame reaches the
      // rendering pipeline, especially in Firefox; inspect after composition.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.waitForTimeout(150);
      const state = await page.evaluate(() => {
        const v = document.querySelector('[data-background-video]');
        const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 18;
        const ctx = canvas.getContext('2d'); ctx.drawImage(v, 0, 0, 32, 18);
        const data = ctx.getImageData(0, 0, 32, 18).data;
        let light = 0;
        for(let i=0;i<data.length;i+=4) if((data[i]+data[i+1]+data[i+2])/3>205) light++;
        return {time:v.currentTime, opacity:getComputedStyle(v).opacity, paused:v.paused, lightRatio:light/(32*18)};
      });
      record(`${engine}/scroll-${time}`, state, state.lightRatio > .9 && state.opacity === '1' && state.paused && Math.abs(state.time-Math.min(time,29.958333)) < .15);
    }
    const footer = await page.evaluate(() => {
      const foot = document.querySelector('.footer');
      const rgb = getComputedStyle(foot).backgroundColor.match(/[\d.]+/g).map(Number);
      const ink = getComputedStyle(foot.querySelector('a')).color.match(/[\d.]+/g).map(Number);
      return {background:getComputedStyle(foot).backgroundColor, light:rgb[3]===0||Math.min(...rgb.slice(0,3))>205, inkDark:Math.max(...ink.slice(0,3))<150, logoVisible:getComputedStyle(foot.querySelector('.foot-logo-img:not(.foot-logo-light)')).display!=='none'};
    });
    record(`${engine}/footer`, footer, footer.light && footer.inkDark && footer.logoVisible);
    await page.screenshot({path:`${output}/${engine}-light-footer.png`});
    for (const mode of ['mobile', 'reduced', 'blocked']) {
      currentStage = `home/${mode}-fallback`;
      const context = await browser.newContext({viewport:mode==='mobile'?{width:390,height:844}:{width:1440,height:900}, reducedMotion:mode==='reduced'?'reduce':'no-preference'});
      if(mode==='blocked') await context.route(`**${oldMovie}`, route => route.abort());
      const fallbackPage = await context.newPage();
      await fallbackPage.goto(`${base}/zh-hant`,{waitUntil:'domcontentloaded'});
      await fallbackPage.waitForFunction(() => document.querySelector('.lh-home')?.dataset.homeState === 'open');
      await fallbackPage.waitForTimeout(300);
      await fallbackPage.evaluate(() => scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));
      await fallbackPage.waitForTimeout(600);
      const state = await fallbackPage.evaluate(async () => {
        const fallback = document.querySelector('[data-background-fallback]');
        const src = getComputedStyle(fallback).backgroundImage.match(/url\("?([^"\)]+)/)?.[1];
        const img = new Image(); img.src = src; await img.decode();
        const c = document.createElement('canvas'); c.width=32;c.height=18;
        const ctx = c.getContext('2d'); ctx.drawImage(img,0,0,32,18);
        const pixels = ctx.getImageData(0,0,32,18).data;
        let light=0;
        for(let i=0;i<pixels.length;i+=4) if((pixels[i]+pixels[i+1]+pixels[i+2])/3>205) light++;
        return {fallbackVisible:getComputedStyle(fallback).opacity==='1',fallbackLight:light/(32*18)>.9, darkTheme:document.querySelector('.lumiq-root').dataset.flowBackground==='true', overflow:document.documentElement.scrollWidth>innerWidth+1};
      });
      record(`${engine}/${mode}-fallback`,state,state.fallbackVisible&&state.fallbackLight&&!state.darkTheme&&!state.overflow);
      await context.close();
    }
  } catch(error) { failures.push({name:engine,stage:currentStage,message:error.message}); }
  finally {await browser.close();}
  console.log(`${engine}: ${checks.filter(c=>c.name.startsWith(engine)).length} checks; ${failures.length} total failures`);
}
await fs.writeFile(`${output}/report.json`,JSON.stringify({checks,failures},null,2));
assert.deepEqual(failures,[]);
