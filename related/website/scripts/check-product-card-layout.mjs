import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const output = process.env.LUMIQ_QA_DIR || '/tmp/lumiq-product-layout-20261001';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const [width, height] of [[1440,1000],[320,740],[390,844],[768,1024],[1100,800],[1280,720],[1920,1080],[2378,1038],[2560,1080]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto('http://localhost:4211/en');
    await page.waitForFunction(() => document.querySelector('.lh-products')?.dataset.enhanced === 'true');
    await page.locator('.lh-products-heading').evaluate(el => scrollTo({ top: scrollY + el.getBoundingClientRect().top - 110, behavior: 'instant' }));
    await page.mouse.move(1,100);
    await page.waitForTimeout(1800);
    // The homepage copy must not depend on the unrelated glass-preview route's CSS.
    await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        if (sheet.href?.includes('GlassCards_tsx.css')) {
          for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
            if (sheet.cssRules[i].selectorText === '.glass-sample-content') sheet.deleteRule(i);
          }
        }
      }
    });
    for (let index = 0; index < 5; index++) {
      const result = await page.evaluate(() => {
        const glass = document.querySelector('.glass-sample-content[data-active="true"]');
        const card = glass || document.querySelector('.lh-product-slot[data-active="true"] .lh-product');
        const title = card.querySelector(glass ? '[data-card-title], .glass-carousel-caption strong' : 'h3');
        const body = card.querySelector('p');
        const cta = card.querySelector(glass ? '[data-card-action], .glass-carousel-caption > span' : '.lh-product-bottom');
        const rect = el => el.getBoundingClientRect().toJSON();
        const b = rect(card), t = rect(title), p = rect(body), c = rect(cta);
        const style = getComputedStyle(body);
        // DOM labels and WebGL artwork share the same 100 CSS px/world-unit scale.
        // The artwork zone's bottom is y=-.07, or 217px from the 420px label top.
        const imageBottom = glass ? b.top + b.height * (217/420) : rect(card.querySelector('.lh-product-art')).bottom;
        return { name: title.textContent, glass: Boolean(glass), card:b, title:t, body:p, cta:c, imageBottom,
          titleCentered: Math.abs(t.left+t.width/2-(b.left+b.width/2))<2,
          symmetricBody: Math.abs(p.left-b.left-(b.right-p.right))<2,
          broadBody: p.width>=b.width*.85,
          align:style.textAlign, font:parseFloat(style.fontSize), fullWidth:Math.abs(p.width-(glass ? rect(card.querySelector('[data-card-copy], .glass-carousel-caption')).width : rect(card.querySelector('.lh-product-copy')).width))<2,
          overflow:document.documentElement.scrollWidth > innerWidth + 1 };
      });
      assert.equal(result.align,'left',`${width}: ${result.name} description alignment`);
      assert.ok(result.titleCentered,`${width}: product title must be centered within the card`);
      assert.ok(result.symmetricBody,`${width}: description needs symmetric small side gutters`);
      assert.ok(result.broadBody,`${width}: description must not collapse into a narrow word-by-word column`);
      assert.ok(result.fullWidth,`${width}: description must use the available card width`);
      assert.ok(result.title.top >= result.imageBottom - 2,`${width}: ${result.name} image/title overlap`);
      assert.ok(result.body.top >= result.title.bottom - 2,`${width}: title/body overlap`);
      assert.ok(result.cta.top >= result.body.bottom - 2,`${width}: body/CTA overlap`);
      assert.ok(result.cta.bottom <= result.card.bottom + 2,`${width}: copy exceeds card`);
      assert.ok(!result.overflow,`${width}: horizontal page overflow`);
      assert.ok(result.font <= (result.glass ? 16 : 13),`${width}: smaller description`);
      results.push({width,height,index,...result});
      if (index===0 || result.name.includes('Print')) await page.screenshot({path:`${output}/products-${width}-${index}.png`});
      await page.locator('[data-products-next]').click({force:true});
      await page.mouse.move(1,100);
      await page.waitForTimeout(1000);
    }
    await page.close();
  }
  await fs.writeFile(`${output}/results.json`,JSON.stringify(results,null,2));
  console.log(`PASS: ${results.length} product/viewport combinations; screenshots in ${output}`);
} finally { await browser.close(); }
