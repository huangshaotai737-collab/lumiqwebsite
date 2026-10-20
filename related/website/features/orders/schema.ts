import { HttpError } from "@/lib/http/result";
import { validateProfileInput } from "@/features/account/service";
import type { CreateOrderInput } from "@/lib/generated/platform/commerce";
export const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function exact(
  value: unknown,
  keys: string[],
): value is Record<string, unknown> {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    Object.keys(value).every((key) => keys.includes(key))
  );
}
export function validUUID(value: unknown): asserts value is string {
  if (typeof value !== "string" || !uuidPattern.test(value))
    throw new HttpError("INVALID_INPUT", 400);
}
export function validateOrderInput(value: unknown): CreateOrderInput {
  if (
    !exact(value, [
      "idempotencyKey",
      "items",
      "shippingAddress",
      "termsVersion",
    ]) ||
    typeof value.idempotencyKey !== "string" ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(value.idempotencyKey) ||
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > 5
  )
    throw new HttpError("INVALID_INPUT", 400);
  validUUID(value.termsVersion);
  const ids = new Set<string>();
  const items = value.items.map((item) => {
    if (!exact(item, ["skuId", "quantity"]))
      throw new HttpError("INVALID_INPUT", 400);
    validUUID(item.skuId);
    if (
      typeof item.quantity !== "number" ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99 ||
      ids.has(item.skuId.toLowerCase())
    )
      throw new HttpError("INVALID_INPUT", 400);
    ids.add(item.skuId.toLowerCase());
    return { skuId: item.skuId.toLowerCase(), quantity: item.quantity };
  });
  if (
    !exact(value.shippingAddress, [
      "name",
      "country",
      "region",
      "city",
      "postalCode",
      "line1",
      "line2",
      "phone",
    ])
  )
    throw new HttpError("INVALID_INPUT", 400);
  const address = validateProfileInput({
    displayName: "",
    locale: "en",
    shippingAddress: value.shippingAddress,
  }).shippingAddress!;
  return {
    idempotencyKey: value.idempotencyKey,
    items,
    shippingAddress: address,
    termsVersion: value.termsVersion.toLowerCase(),
  };
}
