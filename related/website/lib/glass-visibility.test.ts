import {describe, expect, it} from 'vitest';
import {decorativeGlassEvents, glassIsVisible} from './glass-visibility';

describe('decorative glass lifecycle', () => {
  it.each([
    [false, 1, 300, 500, false],
    [true, 0, 300, 500, false],
    [true, .13, 300, 500, false],
    [true, .19, 300, 500, false],
    [true, .2, 300, 500, true],
    [true, 1, 300, 500, true],
    [true, 1, 0, 500, false],
    [true, 1, 300, 0, false],
  ])('intersection %s/%s at %sx%s renders=%s', (isIntersecting, intersectionRatio, width, height, result) => {
    expect(glassIsVisible({isIntersecting, intersectionRatio, boundingClientRect: {width, height}})).toBe(result);
  });
  it('never binds listeners to a potentially detached DOM event source', () => {
    const events = decorativeGlassEvents();
    expect(events).toEqual({enabled: false, priority: 0});
    expect(events.connect).toBeUndefined();
    expect(events.handlers).toBeUndefined();
  });
});
