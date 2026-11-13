export type PlanPrice = { monthly: string; yearly: string };

const LEGACY_FEE = /^\$(\d+(?:\.\d{1,2})?) yr \/ \$(\d+(?:\.\d{1,2})?) mo$/;
const EXPLICIT_FEE = /^\$(\d+(?:\.\d{1,2})?) \/ year; \$(\d+(?:\.\d{1,2})?) \/ month$/;

function cents(amount: string): number | null {
  const [whole, fraction = ''] = amount.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(result) ? result : null;
}

/** Legacy `yr` prices are monthly equivalents; explicit `/ year` prices are totals. */
export function parsePlanPrice(value: string): PlanPrice | null {
  const explicit = value.match(EXPLICIT_FEE);
  const match = explicit ?? value.match(LEGACY_FEE);
  if (!match) return null;
  const first = cents(match[1]);
  const monthly = cents(match[2]);
  if (first === null || monthly === null) return null;
  const annual = first * (explicit ? 1 : 12);
  if (!Number.isSafeInteger(annual)) return null;
  return {
    yearly: explicit ? match[1] : `${Math.floor(annual / 100)}.${String(annual % 100).padStart(2, '0')}`,
    monthly: match[2],
  };
}
