import "server-only";
import { createClient } from "@/lib/auth/server";
import { requireVerifiedUser } from "@/lib/auth/require-user";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { HttpError } from "@/lib/http/result";
import type {
  ApiResult,
  Page,
  PlatformError,
  UUID,
} from "@/lib/generated/platform/core";
import type {
  OrderingCatalog,
  CreateOrderInput,
  CreateOrderResult,
  Order,
} from "@/lib/generated/platform/commerce";
import { validateOrderInput, validUUID } from "./schema";
async function result<T>(run: () => Promise<T>): Promise<ApiResult<T>> {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof HttpError ? error.code : "UNAVAILABLE",
      requestId: crypto.randomUUID(),
    };
  }
}
function rpcError(error: { code?: string } | null) {
  if (!error) return;
  const faults: Record<string, [PlatformError, number]> = {
    "42501": ["FORBIDDEN", 403],
    "23505": ["CONFLICT", 409],
    "22023": ["INVALID_INPUT", 400],
    "23514": ["INVALID_INPUT", 400],
    P0002: ["NOT_FOUND", 404],
    P0004: ["ORDERING_DISABLED", 409],
    P0005: ["RATE_LIMITED", 429],
  };
  const fault = faults[error.code || ""] || ["UNAVAILABLE", 503];
  throw new HttpError(fault[0], fault[1], error.code === "P0005" ? 60 : undefined);
}
export function createOrder(
  input: CreateOrderInput,
): Promise<ApiResult<CreateOrderResult>> {
  return result(async () => {
    const { userId } = await requireVerifiedUser();
    const request = validateOrderInput(input);
    await enforceRateLimit("write", userId);
    const client = await createClient();
    const response = await client.rpc("create_customer_order", { request });
    // C3 emits this exact pair only for a new, uncommitted request after owner/key lookup.
    if (
      response.error?.code === "23505" &&
      response.error.message === "terms changed"
    )
      throw new HttpError("TERMS_CHANGED", 409);
    rpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as CreateOrderResult;
  });
}
export function getOwnOrder(orderId: UUID): Promise<ApiResult<Order>> {
  return result(async () => {
    await requireVerifiedUser();
    validUUID(orderId);
    const client = await createClient();
    const response = await client.rpc("get_customer_order", {
      order_id: orderId,
    });
    rpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as Order;
  });
}
export function listOwnOrders(query: {
  page: number;
  pageSize: number;
}): Promise<ApiResult<Page<Order>>> {
  return result(async () => {
    await requireVerifiedUser();
    if (
      !query ||
      Object.keys(query).some((key) => !["page", "pageSize"].includes(key)) ||
      !Number.isInteger(query.page) ||
      query.page < 1 ||
      query.page > 1000000 ||
      !Number.isInteger(query.pageSize) ||
      query.pageSize < 1 ||
      query.pageSize > 100
    )
      throw new HttpError("INVALID_INPUT", 400);
    const client = await createClient();
    const response = await client.rpc("list_customer_orders", {
      page: query.page,
      page_size: query.pageSize,
    });
    rpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as Page<Order>;
  });
}
export function cancelOrder(orderId: UUID): Promise<ApiResult<Order>> {
  return result(async () => {
    const { userId } = await requireVerifiedUser();
    validUUID(orderId);
    await enforceRateLimit("write", userId);
    const client = await createClient();
    const response = await client.rpc("cancel_customer_order", {
      order_id: orderId,
    });
    rpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as Order;
  });
}

/** Public, no-store commercial projection. Configured offers do not imply ordering is enabled. */
export function getOrderingCatalog(): Promise<ApiResult<OrderingCatalog>> {
  return result(async () => {
    const client = await createClient();
    const response = await client.rpc("get_ordering_catalog");
    rpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as OrderingCatalog;
  });
}
