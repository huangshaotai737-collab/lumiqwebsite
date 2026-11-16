import { expect, it } from 'vitest';
import snapshot from './initial-snapshot.json';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import { fieldIssueTarget, matchesField } from './editor-labels';
it('maps parent USD price errors and amount leaves to the stable amount control', () => {
  const value = structuredClone(snapshot) as ContentSnapshot;
  value.products.nest.price = { kind: 'usd', amount: 42 };
  for (const path of ['products.nest.price', 'products.nest.price.amount'])
    expect(fieldIssueTarget(path, value)).toEqual({ rowPath: 'products.nest.price.kind', controlPath: 'products.nest.price.amount' });
  expect(fieldIssueTarget('products.nest.price.kind', value)).toEqual({ rowPath: 'products.nest.price.kind', controlPath: 'products.nest.price.kind' });
});
it('focuses the price selector when no amount input exists and preserves ordinary field identity', () => {
  const value = structuredClone(snapshot) as ContentSnapshot;
  value.products.nest.price = { kind: 'pending' };
  expect(fieldIssueTarget('products.nest.price', value)).toEqual({ rowPath: 'products.nest.price.kind', controlPath: 'products.nest.price.kind' });
  expect(fieldIssueTarget('products.ola.name', value)).toEqual({ rowPath: 'products.ola.name', controlPath: 'products.ola.name' });
});

it('finds media fields by the same readable scene description shown beside their previews', () => {
  const field = { path: 'media.asset_012d3bf8af92d486.assetId', pages: ['/'], type: 'assetId' as const, maxLength: null, icuSignature: null, mediaPurpose: 'public-content' };
  const value = snapshot as ContentSnapshot;
  expect(matchesField(field, value, '晚間陪伴', '晚間陪伴情境')).toBe(true);
  expect(matchesField(field, value, 'asset_012d3bf8af92d486', '晚間陪伴情境')).toBe(true);
  expect(matchesField(field, value, '不存在的圖片', '晚間陪伴情境')).toBe(false);
});
