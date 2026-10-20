import "server-only";
import type { ApiResult, Page, UUID } from "@/lib/generated/platform/core";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { failure, HttpError } from "@/lib/http/result";
import {
  parseQuery,
  validateNote,
  uuidPattern,
  type OperationsQuery,
} from "./input";
import { operationsResult, operationsRpcError } from "./result";
import { waitlistCsv } from "./csv";
export type WaitlistSummary = {
  id: UUID;
  email: string;
  source: string;
  consentVersion: string;
  createdAt: string;
  status: "new" | "contacted" | "closed";
  note: string;
  version: number;
};
export async function listWaitlist(
  query: OperationsQuery,
): Promise<ApiResult<Page<WaitlistSummary>>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "operations"]);
    const valid = parseQuery(query);
    const client = await createClient();
    const response = await client.rpc("list_waitlist_operations", {
      search: valid.search,
      status: valid.status,
      page: valid.page,
      page_size: valid.pageSize,
    });
    operationsRpcError(response.error);
    if (!response.data) throw new HttpError("UNAVAILABLE", 503);
    return response.data as unknown as Page<WaitlistSummary>;
  });
}
export async function updateWaitlist(input: {
  id: UUID;
  status: WaitlistSummary["status"];
  note: string;
  expectedVersion: number;
}): Promise<ApiResult<null>> {
  return operationsResult(async () => {
    const actor = await requireStaff(["admin", "operations"]);
    await enforceRateLimit("write", actor.userId);
    if (
      !input ||
      typeof input.id !== "string" ||
      !uuidPattern.test(input.id) ||
      !["new", "contacted", "closed"].includes(input.status) ||
      !Number.isSafeInteger(input.expectedVersion) ||
      input.expectedVersion < 0
    )
      throw new HttpError("INVALID_INPUT", 400);
    validateNote(input.note, true);
    const client = await createClient();
    const response = await client.rpc("update_waitlist_operations", {
      id: input.id,
      status: input.status,
      note: input.note,
      expected_version: input.expectedVersion,
    });
    operationsRpcError(response.error);
    return null;
  });
}
export async function exportWaitlist(
  query: OperationsQuery,
): Promise<Response> {
  try {
    await requireStaff(["admin", "operations"]);
    const valid = parseQuery(query);
    const client = await createClient();
    const response = await client.rpc("export_waitlist_operations", {
      search: valid.search,
      status: valid.status,
    });
    operationsRpcError(response.error);
    if (!Array.isArray(response.data)) throw new HttpError("UNAVAILABLE", 503);
    return new Response(
      waitlistCsv(response.data as unknown as WaitlistSummary[]),
      {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="lumiq-waitlist.csv"',
          "Cache-Control": "private, no-store, max-age=0",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
