import { beforeEach, expect, it, vi } from "vitest";
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
import {
  addOrderNote,
  getOrderForStaff,
  listOrders,
  parseOrderQuery,
} from "./service";
import { HttpError } from "@/lib/http/result";
const id = "c4000000-0000-4000-8000-000000000001";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockResolvedValue({ userId: id, role: "operations" });
  mocks.rpc.mockResolvedValue({
    error: null,
    data: { items: [], total: 0, page: 1, pageSize: 25 },
  });
});
it("list/query uses only permitted filters and bounded pages", async () => {
  await listOrders({
    search: " " + id + " ",
    status: "cancelled",
    page: 2,
    pageSize: 10,
  });
  expect(mocks.staff).toHaveBeenCalledWith(["admin", "operations"]);
  expect(mocks.rpc).toHaveBeenCalledWith("list_staff_orders", {
    search: id,
    status: "cancelled",
    page: 2,
    page_size: 10,
  });
  expect(() => parseOrderQuery({ status: "paid" })).toThrow();
  expect(() => parseOrderQuery({ pageSize: 101 })).toThrow();
  expect(() => parseOrderQuery({ owner: id })).toThrow();
});
it("safe errors never expose raw database message", async () => {
  mocks.rpc.mockResolvedValue({
    error: { code: "XX000", message: "private note and email" },
    data: null,
  });
  const r = await getOrderForStaff(id);
  expect(r.ok).toBe(false);
  expect(JSON.stringify(r)).not.toContain("private note");
});
it("note strict shape validates before RPC then uses write limiter", async () => {
  expect((await addOrderNote({ id, note: " " })).ok).toBe(false);
  expect(
    (await addOrderNote({ id, note: "test", status: "paid" } as never)).ok,
  ).toBe(false);
  expect(mocks.rpc).not.toHaveBeenCalled();
  expect((await addOrderNote({ id, note: "test" })).ok).toBe(true);
  expect(mocks.limit).toHaveBeenCalledWith("write", id);
  expect(mocks.rpc).toHaveBeenCalledWith("add_order_note", {
    order_id: id,
    note: "test",
  });
});
it("live app role rejection skips RPC", async () => {
  mocks.staff.mockRejectedValue(new HttpError("FORBIDDEN", 403));
  expect(await getOrderForStaff(id)).toMatchObject({
    ok: false,
    error: "FORBIDDEN",
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
