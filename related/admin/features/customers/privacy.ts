import "server-only";
import { createClient as sdkClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/lib/generated/database";
import type { ApiResult, Page, UUID } from "@/lib/generated/platform/core";
import { requireStaff } from "@/lib/auth/require-staff";
import { createClient } from "@/lib/auth/server";
import { enforceRateLimit } from "@/lib/http/rate-limit";
import { HttpError } from "@/lib/http/result";
import { operationsResult, operationsRpcError } from "../waitlist/result";
import { uuidPattern } from "../waitlist/input";
type Status = "pending" | "completed" | "failed";
export type PrivacyJob = {
  id: UUID;
  userId: UUID;
  status: Status;
  authBanned: boolean;
  authCleared: boolean;
  failureStep: string | null;
  attempts: number;
  createdAt: string;
  leaseUntil: string | null;
};
export type PrivacyWorkspace = { enabled: boolean; jobs: Page<PrivacyJob> };
function trusted() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new HttpError("UNAVAILABLE", 503);
  return sdkClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (resource, options) =>
        fetch(resource, {
          ...options,
          cache: "no-store",
          signal: AbortSignal.timeout(20000),
        }),
    },
  });
}
function validId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !uuidPattern.test(id))
    throw new HttpError("INVALID_INPUT", 400);
}
async function actor() {
  const a = await requireStaff(["admin"]);
  await enforceRateLimit("write", a.userId);
  return a;
}
function checkBan(user: User | null) {
  if (
    !user ||
    !user.banned_until ||
    Date.parse(user.banned_until) < Date.now() + 90 * 365 * 86400000
  )
    throw new Error("Auth ban unverified");
}
function checkContact(user: User | null, id: string) {
  checkBan(user);
  if (!user) throw new Error("missing user");
  if (
    user.email !== `erased-${id}@example.invalid` ||
    user.phone ||
    Object.keys(user.user_metadata).some((k) => k !== "email_verified") ||
    Object.keys(user.app_metadata).some(
      (k) => !["provider", "providers"].includes(k),
    ) ||
    user.identities?.some(
      (i) =>
        i.provider !== "email" ||
        i.identity_data?.email !== user.email ||
        Object.keys(i.identity_data || {}).some(
          (k) =>
            !["sub", "email", "email_verified", "phone_verified"].includes(k),
        ),
    )
  )
    throw new Error("Auth scope unverified");
}
async function run(
  jobId: UUID,
  actorId: UUID,
): Promise<{ status: "completed" | "failed" }> {
  const client = trusted();
  const claimed = await client.rpc("claim_customer_privacy_job", {
    job_id: jobId,
    actor_id: actorId,
  });
  operationsRpcError(claimed.error);
  const claim = claimed.data as unknown as {
    status: Status;
    userId: string;
    leaseToken: string;
  };
  if (!claim) throw new HttpError("UNAVAILABLE", 503);
  if (claim.status === "completed") return { status: "completed" };
  let step: "auth_ban" | "auth_contact" | "application" = "auth_ban";
  const args = { job_id: jobId, token: claim.leaseToken };
  try {
    const banned = await client.auth.admin.updateUserById(claim.userId, {
      ban_duration: "876000h",
    });
    if (banned.error) throw banned.error;
    const first = await client.auth.admin.getUserById(claim.userId);
    if (first.error) throw first.error;
    checkBan(first.data.user);
    const checkpoint = await client.rpc("checkpoint_customer_privacy_auth", {
      ...args,
      step,
    });
    operationsRpcError(checkpoint.error);
    step = "auth_contact";
    const user = first.data.user;
    // Supabase merges metadata; null deletes each existing key. Empty {} would retain PII.
    const clear = (value: Record<string, unknown>, keep: string[] = []) =>
      Object.fromEntries(
        Object.keys(value)
          .filter((k) => !keep.includes(k))
          .map((k) => [k, null]),
      );
    if (
      user.factors?.length ||
      user.identities?.some((i) => i.provider !== "email")
    )
      throw new Error("unsupported linked identity");
    const contact = await client.auth.admin.updateUserById(claim.userId, {
      email: `erased-${claim.userId}@example.invalid`,
      phone: "",
      email_confirm: true,
      user_metadata: clear(user.user_metadata),
      app_metadata: clear(user.app_metadata, ["provider", "providers"]),
    });
    if (contact.error) throw contact.error;
    const verified = await client.auth.admin.getUserById(claim.userId);
    if (verified.error) throw verified.error;
    checkContact(verified.data.user, claim.userId);
    const cleared = await client.rpc("checkpoint_customer_privacy_auth", {
      ...args,
      step,
    });
    operationsRpcError(cleared.error);
    step = "application";
    const result = await client.rpc("anonymize_customer_data", args);
    operationsRpcError(result.error);
    if ((result.data as { status?: string } | null)?.status !== "completed")
      throw new Error("unverified application result");
    return { status: "completed" };
  } catch {
    const failed = await client.rpc("fail_customer_privacy_job", {
      ...args,
      failure_step: step,
    });
    operationsRpcError(failed.error);
    if ((failed.data as { status?: string } | null)?.status !== "failed")
      throw new HttpError("UNAVAILABLE", 503);
    return { status: "failed" };
  }
}
export async function requestAnonymization(input: {
  userId: UUID;
  reason: string;
}): Promise<ApiResult<{ jobId: UUID; status: Status }>> {
  return operationsResult(async () => {
    const a = await actor();
    validId(input?.userId);
    if (!["customer_request", "retention_expired"].includes(input.reason))
      throw new HttpError("INVALID_INPUT", 400);
    const client = await createClient();
    const r = await client.rpc("request_customer_anonymization", {
      user_id: input.userId,
      reason: input.reason,
    });
    operationsRpcError(r.error);
    const job = r.data as unknown as { jobId: UUID; status: Status };
    if (!job) throw new HttpError("UNAVAILABLE", 503);
    if (job.status === "completed") return job;
    return { jobId: job.jobId, ...(await run(job.jobId, a.userId)) };
  });
}
export async function resumeAnonymization(
  jobId: UUID,
): Promise<ApiResult<{ status: "completed" | "failed" }>> {
  return operationsResult(async () => {
    const a = await actor();
    validId(jobId);
    return run(jobId, a.userId);
  });
}
export async function getPrivacyWorkspace(
  search = "",
  page = 1,
): Promise<ApiResult<PrivacyWorkspace>> {
  return operationsResult(async () => {
    await requireStaff(["admin"]);
    const client = await createClient();
    const r = await client.rpc("get_customer_privacy_workspace", {
      search,
      page,
      page_size: 25,
    });
    operationsRpcError(r.error);
    if (!r.data) throw new HttpError("UNAVAILABLE", 503);
    return r.data as unknown as PrivacyWorkspace;
  });
}
