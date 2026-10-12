import {BufferGeometry, Float32BufferAttribute, Shape} from 'three';

export function createPillowGeometry(width: number, height: number) {
  const rings = 48;
  const depth = Math.min(.4, width * .18, height * .18);
  const radius = Math.min(.48, width / 4, height / 4);
  const x = width / 2, y = height / 2;
  const outline = new Shape();
  outline.moveTo(x - radius, -y);
  outline.absarc(x - radius, -y + radius, radius, -Math.PI / 2, 0, false);
  outline.lineTo(x, y - radius);
  outline.absarc(x - radius, y - radius, radius, 0, Math.PI / 2, false);
  outline.lineTo(-x + radius, y);
  outline.absarc(-x + radius, y - radius, radius, Math.PI / 2, Math.PI, false);
  outline.lineTo(-x, -y + radius);
  outline.absarc(-x + radius, -y + radius, radius, Math.PI, Math.PI * 1.5, false);
  outline.closePath();
  // Reserve equal tessellation for each corner and straight segment, so small
  // corners do not become visibly faceted on wide desktop cards.
  const perimeter = outline.curves.flatMap(curve =>
    Array.from({length: 20}, (_, i) => curve.getPoint(i / 20)));
  const around = perimeter.length;
  const positions: number[] = [0, 0, -depth];
  const indices: number[] = [];
  const signedPower = (v: number, power: number) => Math.sign(v) * Math.pow(Math.abs(v), power);
  // Fixed rounded-rectangle silhouette; depth curvature is independent of
  // corner radius. Shared vertices keep the inflated face and shoulder smooth.
  for (let row = 1; row < rings; row++) {
    const latitude = -Math.PI / 2 + row * Math.PI / rings;
    const spread = Math.pow(Math.cos(latitude), .25);
    for (let column = 0; column < around; column++) {
      positions.push(
        perimeter[column].x * spread,
        perimeter[column].y * spread,
        depth * signedPower(Math.sin(latitude), .75),
      );
    }
  }
  const top = positions.length / 3;
  positions.push(0, 0, depth);
  for (let column = 0; column < around; column++) {
    const next = (column + 1) % around;
    indices.push(0, 1 + next, 1 + column);
    for (let row = 0; row < rings - 2; row++) {
      const a = 1 + row * around + column, b = 1 + row * around + next;
      indices.push(a, b, a + around, b, b + around, a + around);
    }
    const last = 1 + (rings - 2) * around;
    indices.push(top, last + column, last + next);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
