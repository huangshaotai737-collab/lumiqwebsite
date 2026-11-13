import {expect, test} from '@playwright/test';

test('waitlist blocks invalid input and recovers from a network failure in all languages', async ({page}) => {
  await page.setViewportSize({width:320,height:740});
  let sent = 0;
  await page.route('**/api/waitlist', route => { sent++; return route.abort(); });
  for (const locale of ['en','zh-hant','ja']) {
    await page.goto(`/${locale}/prelaunch`);
    const form = page.locator('.prelaunch-form');
    const email = form.locator('input[type="email"]');
    const submit = form.locator('button[type="submit"]');
    const before = sent;
    await email.fill('invalid');
    await submit.click();
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
    expect(sent).toBe(before);
    await email.fill('audit-synthetic@example.com');
    await submit.click();
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await expect(email).toHaveValue('audit-synthetic@example.com');
    await expect(submit).toBeEnabled();
    expect(sent).toBe(before + 1);
  }
});

test('account inputs validate without submitting credentials', async ({page}) => {
  const requests: string[] = [];
  await page.route('**/api/auth/**', route => { requests.push(route.request().url()); return route.abort(); });
  for (const route of ['/en/login','/en/register','/en/reset-password']) {
    await page.goto(route);
    const email = page.locator('input[type="email"]');
    await email.fill('invalid');
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
    expect(await email.evaluate((el: HTMLInputElement) => el.form?.checkValidity())).toBe(false);
  }
  expect(requests).toEqual([]);
});
