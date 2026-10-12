export function glassFlowPhase(seconds: number, variant: number) {
  const direction = variant % 2 === 0 ? 1 : -1;
  return variant * 1.0472 + seconds * Math.PI * 2 / (40 + variant * 2) * direction;
}
