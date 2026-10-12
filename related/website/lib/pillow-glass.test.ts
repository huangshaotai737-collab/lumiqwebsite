import {describe, expect, it} from 'vitest';
import {createPillowGeometry} from './pillow-glass';

describe('inflated glass solid', () => {
  it('keeps straight front edges with small corners independent of card aspect ratio', () => {
    for (const [width, height] of [[9.7, 7], [3.5, 8]]) {
      const geometry = createPillowGeometry(width, height);
      const p = geometry.getAttribute('position');
      const topEdge = Array.from({length: p.count}, (_, i) => i).filter(i =>
        Math.abs(p.getZ(i)) < .00001 && p.getY(i) > height / 2 - .001);
      expect(topEdge.length).toBeGreaterThan(5);
      expect(Math.max(...topEdge.map(i => p.getX(i)))).toBeGreaterThan(width / 2 - .7);
      geometry.dispose();
    }
  });
  it('has a continuously rounded face rather than a flat front with bevel bands', () => {
    const geometry = createPillowGeometry(9.7, 7);
    const p = geometry.getAttribute('position');
    const heights = new Set(Array.from({length: p.count}, (_, i) => p.getZ(i).toFixed(3)));
    expect(heights.size).toBeGreaterThan(30);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.x).toBeCloseTo(4.85, 2);
    expect(geometry.boundingBox!.max.y).toBeCloseTo(3.5, 2);
    geometry.dispose();
  });
  it('is a closed solid with every mesh edge shared by two triangles', () => {
    const geometry = createPillowGeometry(2, 5.3);
    const edges = new Map<string, number>();
    const index = geometry.getIndex()!;
    for (let i = 0; i < index.count; i += 3) {
      const triangle = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      for (let j = 0; j < 3; j++) {
        const a = triangle[j], b = triangle[(j + 1) % 3];
        const key = [Math.min(a, b), Math.max(a, b)].join(':');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].every(count => count === 2)).toBe(true);
    geometry.dispose();
  });
});
