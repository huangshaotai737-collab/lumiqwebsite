import "server-only";
import type {
  ApiResult,
  Page,
  UUID,
  ShippingAddress,
} from "@/lib/generated/platform/core";
import type { Order } from "@/lib/generated/platform/commerce";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { HttpError } from "@/lib/http/result";
import {
  operationsResult,
  operationsRpcError,
} from "@/features/waitlist/result";
import { uuidPattern, validateNote } from "@/features/waitlist/input";
export type OrderQuery = {
  search: string;
  status: "all" | "pending_payment_setup" | "cancelled";
  page: number;
  pageSize: number;
};
export type StaffOrderDetail = {
  shippingAddress: ShippingAddress;
  termsVersion: UUID;
  cancelledAt: string | null;
  notes: { id: UUID; note: string; createdAt: string }[];
};
export function parseOrderQuery(value: Record<string, unknown>): OrderQuery {
  const { search = "", status = "all", page = 1, pageSize = 25 } = value;
  const p = Number(page),
    size = Number(pageSize);
  if (
    Object.keys(value).some(
      (k) => !["search", "status", "page", "pageSize"].includes(k),
    ) ||
    typeof search !== "string" ||
    search.length > 254 ||
    typeof status !== "string" ||
    !["all", "pending_payment_setup", "cancelled"].includes(status) ||
    !Number.isSafeInteger(p) ||
    p < 1 ||
    p > 1000000 ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 100
  )
    throw new HttpError("INVALID_INPUT", 400);
  return {
    search: search.trim(),
    status: status as OrderQuery["status"],
    page: p,
    pageSize: size,
  };
}
export function listOrders(query: OrderQuery): Promise<ApiResult<Page<Order>>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "operations"]);
    const valid = parseOrderQuery(query);
    const client = await createClient();
    const r = await client.rpc("list_staff_orders", {
      search: valid.search,
      status: valid.status,
      page: valid.page,
      page_size: valid.pageSize,
    });
    operationsRpcError(r.error);
    if (!r.data) throw new HttpError("UNAVAILABLE", 503);
    return r.data as unknown as Page<Order>;
  });
}
export function getOrderForStaff(id: UUID): Promise<ApiResult<Order>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "operations"]);
    if (!uuidPattern.test(id)) throw new HttpError("INVALID_INPUT", 400);
    const r = await (
      await createClient()
    ).rpc("get_staff_order", { order_id: id });
    operationsRpcError(r.error);
    if (!r.data) throw new HttpError("UNAVAILABLE", 503);
    return r.data as unknown as Order;
  });
}
export function getStaffOrderDetail(
  id: UUID,
): Promise<ApiResult<StaffOrderDetail>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "operations"]);
    if (!uuidPattern.test(id)) throw new HttpError("INVALID_INPUT", 400);
    const r = await (
      await createClient()
    ).rpc("get_staff_order_detail", { order_id: id });
    operationsRpcError(r.error);
    if (!r.data) throw new HttpError("UNAVAILABLE", 503);
    return r.data as unknown as StaffOrderDetail;
  });
}
export function addOrderNote(input: {
  id: UUID;
  note: string;
}): Promise<ApiResult<null>> {
  return operationsResult(async () => {
    const actor = await requireStaff(["admin", "operations"]);
    if (
      !input ||
      Object.keys(input).length !== 2 ||
      typeof input.id !== "string" ||
      !uuidPattern.test(input.id)
    )
      throw new HttpError("INVALID_INPUT", 400);
    validateNote(input.note);
    await enforceRateLimit("write", actor.userId);
    const r = await (
      await createClient()
    ).rpc("add_order_note", { order_id: input.id, note: input.note });
    operationsRpcError(r.error);
    return null;
  });
}
