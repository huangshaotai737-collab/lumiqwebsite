import {expect, test} from '@playwright/test';

test.use({contextOptions: {reducedMotion: 'reduce'}});

test('phone information stays readable and product cards fit a reading view', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  for (const locale of ['en','zh-hant','ja']) {
    await page.goto(`/${locale}/products/tablet`);
    for (const selector of ['.pd-concept-note','.pd-eyebrow','.pd-row-eyebrow']) {
      const copy=page.locator(selector).first();
      const size=await copy.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
      expect(size, locale+selector).toBeGreaterThanOrEqual(16);
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    if(locale==='zh-hant') expect(await page.locator('main h1').first().evaluate(el=>getComputedStyle(el).fontFamily)).toContain('Lumiq Noto Sans TC');
  }
  await page.goto('/en');
  expect(await page.locator('.lh-consent').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.locator('#products').scrollIntoViewIfNeeded();
  const cards=page.locator('.lh-products-viewport .lh-product');
  await expect(cards).toHaveCount(5);
  for (let index=0;index<5;index++) {
    const card=cards.nth(index);
    await card.scrollIntoViewIfNeeded();
    const box=await card.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(455);
    expect(box!.height).toBeLessThanOrEqual(600);
    const text=await card.locator('.lh-product-copy').boundingBox();
    const action=await card.locator('.lh-product-bottom').boundingBox();
    expect(text!.y+text!.height).toBeLessThanOrEqual(action!.y+1);
    expect(action!.y+action!.height).toBeLessThanOrEqual(box!.y+box!.height+1);
  }
});

test('desktop product controls sit below the products and can advance them', async ({page}) => {
  await page.goto('/en');
  const section=page.locator('.lh-products');
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveAttribute('data-enhanced','true');
  await page.waitForTimeout(1200);
  const controls=page.locator('.lh-products-controls');
  const content=await page.locator('.lh-products[data-glass-3d]').count()
    ?page.locator('.lh-glass-products'):page.locator('.lh-products-viewport .lh-product').nth(Number(await section.getAttribute('data-active-product')) || 0);
  const rail=await content.boundingBox(), buttons=await controls.boundingBox();
  expect(buttons!.y).toBeGreaterThanOrEqual(rail!.y+rail!.height-2);
  const before=await section.getAttribute('data-active-product');
  await page.locator('[data-products-next]').click();
  await expect(section).not.toHaveAttribute('data-active-product',before!);
});

test('home finishes its examples before trust and the waitlist', async ({page})=>{
  await page.goto('/en');
  expect(await page.locator('#family').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#safety')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  expect(await page.locator('#safety').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#join')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.locator('.lh-home > [data-home-section]')).toHaveCount(6);
});

test('approved product heading keeps its punctuation',async ({page})=>{
  await page.goto('/en/products');
  await expect(page.locator('.prod-hero h1')).toHaveText(/Stories for children\.\s*Company for adults\./);
});

test('phone Tablet keeps brief feature cards with direct detailed FAQ topics', async ({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/en/products/tablet');
  const links=page.locator('.tablet-faq-links a');
  await expect(links).toHaveCount(2);
  await links.first().click();
  await expect(page).toHaveURL(/\/en\/faq#faq-question-9$/);
  await page.locator('#faq-question-9').click();
  await expect(page.locator('#faq-question-9')).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('#faq-answer-9')).toContainText('ImagiMe');
});
