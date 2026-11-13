import {describe, expect, it} from 'vitest';
import {parsePlanPrice} from './plan-price';

describe('plan price display compatibility', () => {
  it('converts the historical monthly equivalent into its actual annual total', () => {
    expect(parsePlanPrice('$6.99 yr / $7.99 mo')).toEqual({yearly: '83.88', monthly: '7.99'});
    expect(parsePlanPrice('$12.99 yr / $14.99 mo')).toEqual({yearly: '155.88', monthly: '14.99'});
  });

  it('keeps explicitly labelled annual totals and monthly charges unchanged', () => {
    expect(parsePlanPrice('$59.99 / year; $5.99 / month')).toEqual({yearly: '59.99', monthly: '5.99'});
    expect(parsePlanPrice('$139.99 / year; $13.99 / month')).toEqual({yearly: '139.99', monthly: '13.99'});
    expect(parsePlanPrice('$259.99 / year; $25.99 / month')).toEqual({yearly: '259.99', monthly: '25.99'});
  });

  it('calculates legacy annual totals in whole cents', () => {
    expect(parsePlanPrice('$0.29 yr / $0.39 mo')).toEqual({yearly: '3.48', monthly: '0.39'});
  });

  it.each([
    '', '—', 'Price to be announced', '$5.99', '$.. yr / $7.99 mo',
    '$6.999 yr / $7.99 mo', '$59.99 / year; $oops / month',
    '$-6.99 yr / $7.99 mo', '$59.99 / year; $5.99 / month plus tax',
    '$999999999999999999 yr / $7.99 mo', '$59.99 / year; $999999999999999999 / month',
  ])('leaves an unparsed CMS value available for its text fallback: %j', value => {
    expect(parsePlanPrice(value)).toBeNull();
  });
});
