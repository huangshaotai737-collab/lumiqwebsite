import {expect, it} from 'vitest';
import {glassFlowPhase} from './glass-flow';

it('gives all six glass cards distinct slow paths and starting positions', () => {
  const starts = Array.from({length: 6}, (_, i) => glassFlowPhase(0, i + 1));
  const velocities = starts.map((start, i) => glassFlowPhase(1, i + 1) - start);
  expect(new Set(starts).size).toBe(6);
  expect(new Set(velocities).size).toBe(6);
  expect(velocities.some(v => v < 0)).toBe(true);
  expect(velocities.some(v => v > 0)).toBe(true);
  for (const velocity of velocities) expect(Math.abs(velocity)).toBeLessThan(.2);
});
