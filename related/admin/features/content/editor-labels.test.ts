import { expect, it } from 'vitest';
import snapshot from './initial-snapshot.json';
import type { ContentSnapshot } from '@/lib/generated/platform/content';
import { fieldIssueTarget } from './editor-labels';
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
