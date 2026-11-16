import { beforeEach, describe, it, expect, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({
  user: null as null | { id: string; email_confirmed_at: string },
  rpc: vi.fn(),
}));
vi.mock("@/lib/auth/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { access_state: "active" },
            error: null,
          }),
        }),
      }),
    }),
    rpc: state.rpc,
  }),
}));
vi.mock("@/lib/http/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
import {
  getOrderingCatalog,
  createOrder,
  getOwnOrder,
  listOwnOrders,
  cancelOrder,
} from "./service";
const sku = "11000000-0000-4000-8000-000000000001",
  release = "11000000-0000-4000-8000-000000000002";
const input = {
  idempotencyKey: "synthetic-key-1",
  items: [{ skuId: sku, quantity: 2 }],
  shippingAddress: {
    name: "Test",
    country: "US",
    region: "CA",
    city: "Test",
    postalCode: "123",
    line1: "Test street",
    line2: "",
    phone: "",
  },
  termsVersion: release,
};
const order = {
  id: release,
  userId: sku,
  status: "pending_payment_setup",
  paymentStatus: "not_configured",
  fulfillmentStatus: "not_scheduled",
  currency: "USD",
  totals: {
    itemsMinor: 200,
    shippingMinor: null,
    taxMinor: null,
    payableMinor: null,
  },
  items: [
    {
      skuId: sku,
      productId: "ola",
      name: "LumiQ Ola",
      quantity: 2,
      unitMinor: 100,
    },
  ],
  createdAt: "2026-10-20T00:00:00Z",
};
describe("server order boundary", () => {
  beforeEach(() => {
    state.user = { id: sku, email_confirmed_at: "2026-10-20" };
    state.rpc.mockReset();
  });
  it("same_customer_retry_is_one_order", async () => {
    state.rpc
      .mockResolvedValueOnce({ data: { order, reused: false }, error: null })
      .mockResolvedValueOnce({ data: { order, reused: true }, error: null });
    const first = await createOrder(input),
      second = await createOrder(input);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok)
      throw new Error("expected successful transaction results");
    expect(first.data.order.id).toBe(second.data.order.id);
    expect(second.data.reused).toBe(true);
    expect(state.rpc).toHaveBeenCalledWith("create_customer_order", {
      request: input,
    });
  });
  it("client_price_is_not_trusted", async () => {
    const result = await createOrder({
      ...input,
      unitMinor: 1,
    } as typeof input);
    expect(result).toMatchObject({ ok: false, error: "INVALID_INPUT" });
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("rejects anonymous and unverified before any RPC", async () => {
    state.user = null;
    expect(await createOrder(input)).toMatchObject({
      ok: false,
      error: "UNAUTHENTICATED",
    });
    state.user = { id: sku, email_confirmed_at: "" };
    expect(await createOrder(input)).toMatchObject({
      ok: false,
      error: "FORBIDDEN",
    });
    expect(await cancelOrder(release)).toMatchObject({
      ok: false,
      error: "FORBIDDEN",
    });
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("rejects invalid quantities, duplicates, unknown fields and unsafe inputs", async () => {
    for (const quantity of [0, -1, 1.5, 100, Number.MAX_SAFE_INTEGER + 1, NaN])
      expect(
        await createOrder({ ...input, items: [{ skuId: sku, quantity }] }),
      ).toMatchObject({ ok: false, error: "INVALID_INPUT" });
    for (const value of [
      { ...input, items: [...input.items, ...input.items] },
      { ...input, items: [{ skuId: sku, quantity: 1, unitMinor: 1 }] },
      { ...input, idempotencyKey: "" },
      { ...input, shippingAddress: { ...input.shippingAddress, userId: sku } },
      { ...input, termsVersion: "draft" },
      {
        ...input,
        shippingAddress: { ...input.shippingAddress, country: "ZZ" },
      },
    ])
      expect(await createOrder(value)).toMatchObject({
        ok: false,
        error: "INVALID_INPUT",
      });
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("maps atomic DB errors without leaking details", async () => {
    for (const [code, error] of [
      ["P0004", "ORDERING_DISABLED"],
      ["23505", "CONFLICT"],
      ["42501", "FORBIDDEN"],
      ["22023", "INVALID_INPUT"],
      ["P0002", "NOT_FOUND"],
      ["XX000", "UNAVAILABLE"],
    ]) {
      state.rpc.mockResolvedValueOnce({
        data: null,
        error: { code, message: "private" },
      });
      expect(await createOrder(input)).toMatchObject({ ok: false, error });
    }
  });
  it("uses own-session RPCs and validates read pagination", async () => {
    state.rpc.mockResolvedValue({ data: order, error: null });
    expect(await getOwnOrder(release)).toEqual({ ok: true, data: order });
    expect(await cancelOrder(release)).toEqual({ ok: true, data: order });
    expect(state.rpc).toHaveBeenCalledWith("get_customer_order", {
      order_id: release,
    });
    expect(state.rpc).toHaveBeenCalledWith("cancel_customer_order", {
      order_id: release,
    });
    expect(await listOwnOrders({ page: 0, pageSize: 25 })).toMatchObject({
      ok: false,
      error: "INVALID_INPUT",
    });
  });
});

it("public catalog works anonymously and never converts failed reads to an available catalog", async () => {
  state.user = null;
  const catalog = {
    orderingEnabled: false,
    unavailableReason: "ORDERING_DISABLED",
    terms: null,
    offerings: [],
  };
  state.rpc.mockResolvedValueOnce({ data: catalog, error: null });
  expect(await getOrderingCatalog()).toEqual({ ok: true, data: catalog });
  expect(state.rpc).toHaveBeenCalledWith("get_ordering_catalog");
  state.rpc.mockResolvedValueOnce({ data: null, error: { code: "XX000" } });
  expect(await getOrderingCatalog()).toMatchObject({
    ok: false,
    error: "UNAVAILABLE",
  });
});

it("only the trusted stale-terms SQL pair gets the deterministic recovery code", async () => {
  state.user = { id: sku, email_confirmed_at: "2026-10-20" };
  for (const [code, message, expected] of [
    ["23505", "terms changed", "TERMS_CHANGED"],
    ["23505", "idempotency request conflict", "CONFLICT"],
    ["23505", "terms changed private suffix", "CONFLICT"],
    ["XX000", "terms changed", "UNAVAILABLE"],
  ]) {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code, message } });
    const result = await createOrder(input);
    expect(result).toMatchObject({ ok: false, error: expected });
    expect(JSON.stringify(result)).not.toContain(message);
  }
});
