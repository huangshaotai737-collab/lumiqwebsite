import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  staff: vi.fn(),
  rpc: vi.fn(),
  limit: vi.fn(),
}));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: mocks.staff }));
vi.mock("@/lib/auth/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));
vi.mock("@/lib/http/rate-limit", () => ({ enforceRateLimit: mocks.limit }));
import { csvCell, waitlistCsv } from "./csv";
import { listWaitlist, updateWaitlist, exportWaitlist } from "./service";
import { parseQuery } from "./input";
import { HttpError } from "@/lib/http/result";
afterEach(() => vi.resetAllMocks());
it("csv_formula_is_inert", () => {
  for (const value of [
    "=1+1",
    "+1",
    "-1",
    "@SUM(A1)",
    "\t1",
    "\r1",
    "  =1",
    " \t=1",
    "\n +1",
  ])
    expect(csvCell(value)).toBe(`"'${value}"`);
  expect(csvCell('hello,"world"\nnext')).toBe('"hello,""world""\nnext"');
  expect(
    waitlistCsv([
      {
        id: "id",
        email: "a@b.test",
        source: "prelaunch",
        consentVersion: "v1",
        createdAt: "now",
        status: "new",
        note: "=1+1",
        version: 0,
      },
    ]),
  ).toContain("'=1+1");
});
it("editor_cannot_export_waitlist", async () => {
  mocks.staff.mockRejectedValue(new HttpError("FORBIDDEN", 403));
  const response = await exportWaitlist({
    search: "",
    status: "all",
    page: 1,
    pageSize: 25,
  });
  expect(response.status).toBe(403);
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("normalizes paging without allowing malformed input", () => {
  expect(parseQuery({})).toEqual({
    search: "",
    status: "all",
    page: 1,
    pageSize: 25,
  });
  expect(parseQuery({ pageSize: 101 })).toMatchObject({ pageSize: 100 });
  for (const query of [
    { page: 0 },
    { page: 1.5 },
    { page: "broken" },
    { status: "forged" },
    { search: "a".repeat(255) },
  ])
    expect(() => parseQuery(query)).toThrow("INVALID_INPUT");
});
it("never reports empty success after database read failure", async () => {
  mocks.staff.mockResolvedValue({ userId: "actor", role: "operations" });
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { code: "XX000", message: "private email" },
  });
  const result = await listWaitlist({
    search: "",
    status: "all",
    page: 2,
    pageSize: 25,
  });
  expect(result).toMatchObject({ ok: false, error: "UNAVAILABLE" });
  expect(JSON.stringify(result)).not.toContain("private email");
});
it("save conflict and audit failure cannot report success", async () => {
  mocks.staff.mockResolvedValue({ userId: "actor", role: "operations" });
  for (const [code, error] of [
    ["23505", "CONFLICT"],
    ["XX000", "UNAVAILABLE"],
  ]) {
    mocks.rpc.mockResolvedValue({ data: null, error: { code } });
    expect(
      await updateWaitlist({
        id: "10000000-0000-4000-8000-000000000001",
        status: "closed",
        note: "note",
        expectedVersion: 0,
      }),
    ).toMatchObject({ ok: false, error });
  }
});
it("no available audit means no CSV and no success", async () => {
  mocks.staff.mockResolvedValue({ userId: "actor", role: "operations" });
  mocks.rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
  const response = await exportWaitlist({
    search: "sensitive@example.test",
    status: "new",
    page: 1,
    pageSize: 25,
  });
  expect(response.status).toBe(503);
  expect(response.headers.get("content-type")).not.toContain("text/csv");
  expect(await response.text()).not.toContain("sensitive");
});
it("returns page metadata including an empty out-of-range page", async () => {
  mocks.staff.mockResolvedValue({ userId: "actor", role: "admin" });
  mocks.rpc.mockResolvedValue({
    data: { items: [], total: 2, page: 9, pageSize: 25 },
    error: null,
  });
  expect(
    await listWaitlist({ search: "", status: "all", page: 9, pageSize: 25 }),
  ).toMatchObject({
    ok: true,
    data: { items: [], total: 2, page: 9, pageSize: 25 },
  });
});
it("rejects malformed IDs and oversized notes before writing", async () => {
  mocks.staff.mockResolvedValue({ userId: "actor", role: "operations" });
  const valid = {
    id: "10000000-0000-4000-8000-000000000001",
    status: "new" as const,
    note: "",
    expectedVersion: 0,
  };
  expect(
    await updateWaitlist({ ...valid, id: [valid.id] as unknown as string }),
  ).toMatchObject({ ok: false, error: "INVALID_INPUT" });
  expect(
    await updateWaitlist({ ...valid, note: "x".repeat(2001) }),
  ).toMatchObject({ ok: false, error: "INVALID_INPUT" });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
