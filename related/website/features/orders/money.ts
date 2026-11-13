import { currencyMinorDigits } from "@/lib/generated/platform/commerce";
export function orderMoney(amount: number, currency: string, locale: string) {
  const digits =
    currencyMinorDigits[currency as keyof typeof currencyMinorDigits];
  return new Intl.NumberFormat(locale === "zh-hant" ? "zh-TW" : locale, {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount / 10 ** digits);
}
