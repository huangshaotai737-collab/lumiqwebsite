import {expect, test} from '@playwright/test';
import type * as Axe from 'axe-core';

async function violations(page: import('@playwright/test').Page, selector: string, rules?: string[]) {
  await page.addScriptTag({path: require.resolve('axe-core/axe.min.js')});
  return page.evaluate(async ({selector, rules}) => {
    const {violations} = await (window as typeof window & {axe: typeof Axe}).axe.run(
      {include: [[selector]]},
      rules ? {runOnly: {type:'rule', values:rules}} : {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}},
    );
    return violations.map(({id,nodes})=>({id,targets:nodes.map(node=>node.target)}));
  }, {selector, rules});
}

test('secondary FAQ and Orb labels meet text contrast requirements', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  for (const [route,selector] of [['/en/faq','.faq-count'],['/en/products/nest','.orb-section-number']]) {
    await page.goto(route);
    await expect(page.locator(selector).first()).toBeVisible();
    expect.soft(await violations(page,selector,['color-contrast']), route).toEqual([]);
  }
});

test('expanded navigation uses valid accessible roles', async ({page}) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/en/faq');
  await page.locator('.lang-btn').click();
  expect.soft(await violations(page,'.site-nav'), 'desktop language disclosure').toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.lang-btn')).toBeFocused();
  await page.setViewportSize({width:390,height:900});
  await page.locator('.site-mobile-trigger').focus();
  await page.keyboard.press('Enter');
  expect.soft(await violations(page,'.site-nav'), 'mobile navigation disclosure').toEqual([]);
  await page.locator('.site-mobile-close').click();
  await expect(page.locator('.site-mobile-trigger')).toBeFocused();
});
