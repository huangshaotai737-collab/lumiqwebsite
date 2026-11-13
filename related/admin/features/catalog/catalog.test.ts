import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const state = vi.hoisted(() => ({ role: "admin", rpc: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({
  requireStaff: async (roles: string[]) => {
    if (!roles.includes(state.role)) throw new HttpError("FORBIDDEN", 403);
    return { userId: "test" };
  },
}));
vi.mock("@/lib/auth/server", () => ({
  createClient: async () => ({ rpc: state.rpc }),
}));
vi.mock("@/lib/http/rate-limit", () => ({ enforceRateLimit: vi.fn() }));
import { HttpError } from "@/lib/http/result";
import { getCatalogWorkspace, setCatalogOffering } from "./service";
const input = {
  skuId: "11000000-0000-4000-8000-000000000001",
  currency: "USD",
  unitMinor: 100,
  confirmed: true,
  enabled: true,
  expectedVersion: 0,
};
beforeEach(() => {
  state.role = "admin";
  state.rpc.mockReset();
  state.rpc.mockResolvedValue({ data: null, error: null });
});
it("admin alone can confirm actual commercial offerings", async () => {
  expect(await setCatalogOffering(input)).toEqual({ ok: true, data: null });
  expect(state.rpc).toHaveBeenCalledWith("set_catalog_offering", {
    sku_id: input.skuId,
    currency: "USD",
    unit_minor: 100,
    confirmed: true,
    enabled: true,
    expected_version: 0,
  });
  for (const role of ["editor", "operations", "member"]) {
    state.role = role;
    expect(await setCatalogOffering(input)).toMatchObject({
      ok: false,
      error: "FORBIDDEN",
    });
  }
});
it("rejects browser authority, fractional and unsafe amounts and unconfirmed enablement", async () => {
  for (const value of [
    { ...input, userId: "forged" },
    { ...input, unitMinor: -1 },
    { ...input, unitMinor: 1.5 },
    { ...input, unitMinor: Number.MAX_SAFE_INTEGER + 1 },
    { ...input, confirmed: false },
    { ...input, expectedVersion: -1 },
    { ...input, currency: "ZZZ" },
  ])
    expect(await setCatalogOffering(value)).toMatchObject({
      ok: false,
      error: "INVALID_INPUT",
    });
  expect(state.rpc).not.toHaveBeenCalled();
});
it("maps optimistic conflicts", async () => {
  state.rpc.mockResolvedValue({ error: { code: "23505" } });
  expect(await setCatalogOffering(input)).toMatchObject({
    ok: false,
    error: "CONFLICT",
  });
});

it('operations can inspect private disabled and unconfirmed catalog',async()=>{
 state.role='operations';
 const data={offerings:[{...input,enabled:false,confirmed:false}],settings:{ordersEnabled:false}};
 state.rpc.mockResolvedValue({data,error:null});
 expect(await getCatalogWorkspace()).toEqual({ok:true,data});
});
