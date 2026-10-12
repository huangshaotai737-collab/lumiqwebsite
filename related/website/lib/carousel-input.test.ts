import {describe, expect, it} from 'vitest';
import {CarouselInput} from './carousel-input';

describe('one page per scroll gesture', () => {
  it('consumes a long inertial tail even after the transition timeout', () => {
    const input = new CarouselInput();
    const steps = Array.from({length: 35}, (_, i) => input.wheel(Math.max(1, 100 - i * 4), i * 80));
    expect(steps.filter(Boolean)).toEqual([1]);
    expect(input.wheel(-100, 3500)).toBe(-1);
  });
  it('does not queue gestures received during a button transition', () => {
    const input = new CarouselInput();
    expect(input.navigate(0)).toBe(true);
    expect(input.navigate(50)).toBe(false);
    expect(input.wheel(120, 100)).toBe(0);
    for (let t = 200; t < 1600; t += 100) expect(input.wheel(30, t)).toBe(0);
    expect(input.wheel(120, 2000)).toBe(1);
  });
  it('accumulates tiny deltas and does not mistake a tail reversal for a new gesture', () => {
    const input = new CarouselInput();
    expect(input.wheel(3, 0)).toBe(0);
    expect(input.wheel(4, 40)).toBe(0);
    expect(input.wheel(6, 80)).toBe(1);
    expect(input.wheel(-120, 160)).toBe(0);
    expect(input.wheel(-120, 1000)).toBe(-1);
  });
  it('groups by event timestamps even when the main thread receives events late', () => {
    const input = new CarouselInput();
    expect(input.wheel(120, 0, 0)).toBe(1);
    expect(input.wheel(100, 40, 900)).toBe(0);
  });
});
