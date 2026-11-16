import {expect, test} from '@playwright/test';

test('design preview routes are excluded from search indexing in every language', async ({request}) => {
  for (const locale of ['en', 'zh-hant', 'ja']) {
    const response = await request.get(`/${locale}/glass-preview`);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(/<meta name="robots" content="[^"]*noindex/.test(html), `${locale} design preview robots`).toBe(true);
  }
});
