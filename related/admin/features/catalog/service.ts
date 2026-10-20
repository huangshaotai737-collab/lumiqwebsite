import "server-only";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { HttpError } from "@/lib/http/result";
import type { ApiResult } from "@/lib/generated/platform/core";
import {
  currencyMinorDigits,
  type CatalogOfferingInput,
  type CatalogWorkspace,
  type CommerceSettingsInput,
} from "@/lib/generated/platform/commerce";
import {
  operationsResult,
  operationsRpcError,
} from "@/features/waitlist/result";
import { uuidPattern } from "@/features/waitlist/input";
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
export function setCatalogOffering(
  input: CatalogOfferingInput,
): Promise<ApiResult<null>> {
  return operationsResult(async () => {
    const actor = await requireStaff(["admin"]);
    if (
      !exact(input, [
        "skuId",
        "currency",
        "unitMinor",
        "confirmed",
        "enabled",
        "expectedVersion",
      ]) ||
      typeof input.skuId !== "string" ||
      !uuidPattern.test(input.skuId) ||
      !Object.hasOwn(currencyMinorDigits, input.currency) ||
      !Number.isSafeInteger(input.unitMinor) ||
      input.unitMinor < 0 ||
      typeof input.confirmed !== "boolean" ||
      typeof input.enabled !== "boolean" ||
      (input.enabled && !input.confirmed) ||
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      input.expectedVersion > 2147483646
    )
      throw new HttpError("INVALID_INPUT", 400);
    await enforceRateLimit("write", actor.userId);
    const client = await createClient();
    const response = await client.rpc("set_catalog_offering", {
      sku_id: input.skuId,
      currency: input.currency,
      unit_minor: input.unitMinor,
      confirmed: input.confirmed,
      enabled: input.enabled,
      expected_version: input.expectedVersion,
    });
    operationsRpcError(response.error);
    return null;
  });
}
export function updateCommerceSettings(
  input: CommerceSettingsInput,
): Promise<ApiResult<null>> {
  return operationsResult(async () => {
    const actor = await requireStaff(["admin"]);
    if (
      !exact(input, ["ordersEnabled", "termsReleaseId", "expectedVersion"]) ||
      typeof input.ordersEnabled !== "boolean" ||
      (input.termsReleaseId !== null &&
        (typeof input.termsReleaseId !== "string" ||
          !uuidPattern.test(input.termsReleaseId))) ||
      (input.ordersEnabled && !input.termsReleaseId) ||
      !Number.isInteger(input.expectedVersion) ||
      input.expectedVersion < 0 ||
      input.expectedVersion > 2147483646
    )
      throw new HttpError("INVALID_INPUT", 400);
    // SQL explicitly accepts NULL to clear approval while disabled; generated RPC args omit nullability.
    await enforceRateLimit("write", actor.userId);
    const client = await createClient();
    const response = await client.rpc("update_commerce_settings", {
      orders_enabled: input.ordersEnabled,
      terms_release_id: input.termsReleaseId!,
      expected_version: input.expectedVersion,
    });
    operationsRpcError(response.error);
    return null;
  });
}
export function getCatalogWorkspace(): Promise<ApiResult<CatalogWorkspace>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "operations"]);
    const client = await createClient();
    const response = await client.rpc("get_catalog_workspace");
    operationsRpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as CatalogWorkspace;
  });
}
