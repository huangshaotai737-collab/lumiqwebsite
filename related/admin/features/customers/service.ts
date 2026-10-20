import "server-only";
import type { ApiResult, Page, UUID } from "@/lib/generated/platform/core";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { HttpError } from "@/lib/http/result";
import { parseQuery, validateNote, uuidPattern } from "../waitlist/input";
import { operationsResult, operationsRpcError } from "../waitlist/result";
export type CustomerSummary = {
  id: UUID;
  displayName: string;
  email: string;
  createdAt: string;
};
export type CustomerNote = { id: UUID; note: string; createdAt: string };
export async function listCustomers(query: {
  search: string;
  page: number;
  pageSize: number;
}): Promise<ApiResult<Page<CustomerSummary>>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "operations"]);
    const valid = parseQuery(query);
    const client = await createClient();
    const response = await client.rpc("list_customer_operations", {
      search: valid.search,
      page: valid.page,
      page_size: valid.pageSize,
    });
    operationsRpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as Page<CustomerSummary>;
  });
}
export async function addCustomerNote(input: {
  userId: UUID;
  note: string;
}): Promise<ApiResult<null>> {
  return operationsResult(async () => {
    const actor = await requireStaff(["admin", "operations"]);
    await enforceRateLimit("write", actor.userId);
    if (
      !input ||
      typeof input.userId !== "string" ||
      !uuidPattern.test(input.userId)
    )
      throw new HttpError("INVALID_INPUT", 400);
    validateNote(input.note);
    const client = await createClient();
    const response = await client.rpc("add_customer_note", {
      user_id: input.userId,
      note: input.note,
    });
    operationsRpcError(response.error);
    return null;
  });
}
export async function listCustomerNotes(
  userId: UUID,
): Promise<ApiResult<CustomerNote[]>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "operations"]);
    if (!uuidPattern.test(userId)) throw new HttpError("INVALID_INPUT", 400);
    const client = await createClient();
    const response = await client.rpc("list_customer_notes", {
      user_id: userId,
    });
    operationsRpcError(response.error);
    if (!Array.isArray(response.data)) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as CustomerNote[];
  });
}
