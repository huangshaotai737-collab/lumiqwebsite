import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({
  staff: vi.fn(),
  rpc: vi.fn(),
  serviceRpc: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: m.staff }));
vi.mock("@/lib/auth/server", () => ({
  createClient: async () => ({ rpc: m.rpc }),
}));
vi.mock("@/lib/http/rate-limit", () => ({ enforceRateLimit: m.limit }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    rpc: m.serviceRpc,
    auth: { admin: { getUserById: m.get, updateUserById: m.update } },
  }),
}));
import { requestAnonymization, resumeAnonymization } from "./privacy";
import { HttpError } from "@/lib/http/result";
const id = "b6000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "synthetic";
  m.staff.mockResolvedValue({ userId: id, role: "admin" });
  m.rpc.mockResolvedValue({
    data: { jobId: id, status: "pending" },
    error: null,
  });
  m.serviceRpc.mockImplementation(async (name) => ({
    data:
      name === "claim_customer_privacy_job"
        ? { userId: id, leaseToken: id, status: "pending" }
        : { status: "failed" },
    error: null,
  }));
  m.get.mockResolvedValue({
    data: {
      user: {
        banned_until: "2130-01-01T00:00:00Z",
        email: `erased-${id}@example.invalid`,
        phone: "",
        user_metadata: {},
        app_metadata: { provider: "email" },
        identities: [],
      },
    },
    error: null,
  });
});
it("failed_auth_step_is_not_complete", async () => {
  m.update.mockResolvedValue({ error: { message: "private failure" } });
  const r = await requestAnonymization({
    userId: id,
    reason: "customer_request",
  });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.data.status).not.toBe("completed");
  expect(m.serviceRpc).toHaveBeenCalledWith(
    "fail_customer_privacy_job",
    expect.objectContaining({ failure_step: "auth_ban" }),
  );
  expect(JSON.stringify(r)).not.toContain("private failure");
});
it("policy refusal cannot reach Auth", async () => {
  m.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  expect(
    await requestAnonymization({ userId: id, reason: "customer_request" }),
  ).toMatchObject({ ok: false, error: "FORBIDDEN" });
  expect(m.update).not.toHaveBeenCalled();
});
it("only admin can start or resume", async () => {
  m.staff.mockRejectedValue(new HttpError("FORBIDDEN", 403));
  expect(await resumeAnonymization(id)).toMatchObject({
    ok: false,
    error: "FORBIDDEN",
  });
  expect(m.rpc).not.toHaveBeenCalled();
});
it("completed replay never mutates Auth", async () => {
  m.rpc.mockResolvedValue({
    data: { jobId: id, status: "completed" },
    error: null,
  });
  expect(
    await requestAnonymization({ userId: id, reason: "customer_request" }),
  ).toMatchObject({ ok: true, data: { status: "completed" } });
  expect(m.update).not.toHaveBeenCalled();
});
it("contact failure is durable and can resume", async () => {
  m.update
    .mockResolvedValueOnce({ error: null })
    .mockResolvedValueOnce({ error: { message: "contact" } });
  expect(await resumeAnonymization(id)).toMatchObject({
    ok: true,
    data: { status: "failed" },
  });
  expect(m.serviceRpc).toHaveBeenCalledWith(
    "fail_customer_privacy_job",
    expect.objectContaining({ failure_step: "auth_contact" }),
  );
  m.update.mockResolvedValue({ error: null });
  m.serviceRpc.mockImplementation(async (name) => ({
    data:
      name === "claim_customer_privacy_job"
        ? { userId: id, leaseToken: id, status: "pending" }
        : { status: "completed" },
    error: null,
  }));
  expect(await resumeAnonymization(id)).toMatchObject({
    ok: true,
    data: { status: "completed" },
  });
});
it("failure persistence failure is unavailable, never invented completion", async () => {
  m.update.mockRejectedValue(new Error("network"));
  m.serviceRpc.mockImplementation(async (name) =>
    name === "claim_customer_privacy_job"
      ? { data: { userId: id, leaseToken: id, status: "pending" }, error: null }
      : { data: null, error: { code: "XX000" } },
  );
  expect(await resumeAnonymization(id)).toMatchObject({
    ok: false,
    error: "UNAVAILABLE",
  });
});
