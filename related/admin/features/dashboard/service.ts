import "server-only";
import type { ApiResult } from "@/lib/generated/platform/core";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/auth/server";
import { HttpError } from "@/lib/http/result";
import { operationsResult, operationsRpcError } from "../waitlist/result";
export type AuditSummary = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};
export type DashboardData = {
  customers: number | null;
  waitlist: number | null;
  orders: number | null;
  drafts: number | null;
  recentAudit: AuditSummary[];
};
export async function getDashboard(): Promise<ApiResult<DashboardData>> {
  return operationsResult(async () => {
    await requireStaff(["admin", "editor", "operations"]);
    const client = await createClient();
    const result = await client.rpc("get_admin_dashboard");
    operationsRpcError(result.error);
    if (!result.data) throw new HttpError("UNAVAILABLE", 503);
    return result.data as unknown as DashboardData;
  });
}
