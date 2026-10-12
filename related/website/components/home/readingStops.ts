/** Keep a settled composition still; otherwise settle in the user's direction. */
export function readingStop(value: number, stops: number[], direction: number, reach = 0.3) {
  if (stops.some((stop) => Math.abs(stop - value) < 0.003)) return value;
  const next = direction < 0
    ? [...stops].reverse().find((stop) => stop < value)
    : stops.find((stop) => stop > value);
  return next !== undefined && Math.abs(next - value) <= reach ? next : value;
}
