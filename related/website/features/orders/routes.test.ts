import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  cancel: vi.fn(),
  identity: vi.fn(),
}));
vi.mock("./service", () => ({
  createOrder: mocks.create,
  listOwnOrders: mocks.list,
  getOwnOrder: mocks.get,
  cancelOrder: mocks.cancel,
}));
vi.mock("@/lib/auth/require-user", () => ({
  requireVerifiedUser: mocks.identity,
}));
import { GET, POST } from "@/app/api/orders/route";
import { GET as detail } from "@/app/api/orders/[id]/route";
import { POST as cancel } from "@/app/api/orders/[id]/cancel/route";
const origin = "http://localhost:4211";
const order = {
  id: "c4000000-0000-4000-8000-000000000001",
  status: "pending_payment_setup",
};
function request(path = "/api/orders", body: unknown = {}) {
  return new Request(origin + path, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  process.env.APP_ORIGIN = origin;
  mocks.identity.mockResolvedValue({ userId: "current" });
  mocks.get.mockResolvedValue({ ok: true, data: order });
  mocks.cancel.mockResolvedValue({
    ok: true,
    data: { ...order, status: "cancelled" },
  });
});
describe("customer HTTP contract", () => {
  it.each([
    [false, 201],
    [true, 200],
  ] as const)("created/reused %s returns %s", async (reused, status) => {
    mocks.create.mockResolvedValue({ ok: true, data: { order, reused } });
    const r = await POST(request());
    expect(r.status).toBe(status);
    expect(r.headers.get("cache-control")).toContain("no-store");
    expect((await r.json()).data.reused).toBe(reused);
  });
  it("conflict remains409 with safe envelope", async () => {
    mocks.create.mockResolvedValue({
      ok: false,
      error: "CONFLICT",
      requestId: "safe",
    });
    const r = await POST(request());
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({
      ok: false,
      error: "CONFLICT",
      requestId: "safe",
    });
  });
  it("origin and stale identity reject before creating an order", async () => {
    const cross = request();
    cross.headers.set("origin", "https://other.invalid");
    expect((await POST(cross)).status).toBe(403);
    const stale = request();
    stale.headers.set("x-lumiq-customer", "previous");
    expect((await POST(stale)).status).toBe(409);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("invalid JSON and query do not become success", async () => {
    expect(
      (
        await POST(
          new Request(origin + "/api/orders", {
            method: "POST",
            headers: { origin },
            body: "{",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (await GET(new Request(origin + "/api/orders?userId=other"))).status,
    ).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });
  it("detail GET and repeat cancel preserve contract and strict empty body", async () => {
    const context = { params: Promise.resolve({ id: order.id }) };
    expect((await detail(new Request(origin), context)).status).toBe(200);
    expect(
      (await cancel(request("/api/orders/" + order.id + "/cancel"), context))
        .status,
    ).toBe(200);
    expect(mocks.cancel).toHaveBeenCalledWith(order.id);
    expect(
      (
        await cancel(
          request("/api/orders/" + order.id + "/cancel", { status: "paid" }),
          context,
        )
      ).status,
    ).toBe(400);
  });
});

it("deterministic stale terms is a safe no-store409", async () => {
  mocks.create.mockResolvedValue({
    ok: false,
    error: "TERMS_CHANGED",
    requestId: "safe",
  });
  const response = await POST(request());
  expect(response.status).toBe(409);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect(await response.json()).toEqual({
    ok: false,
    error: "TERMS_CHANGED",
    requestId: "safe",
  });
});
