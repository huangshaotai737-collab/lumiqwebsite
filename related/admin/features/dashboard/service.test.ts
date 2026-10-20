import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const m = vi.hoisted(() => ({ staff: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth/require-staff", () => ({ requireStaff: m.staff }));
vi.mock("@/lib/auth/server", () => ({
  createClient: async () => ({ rpc: m.rpc }),
}));
import { getDashboard } from "./service";
it("returns actual scoped counts including null inaccessible categories", async () => {
  m.staff.mockResolvedValue({ role: "editor" });
  m.rpc.mockResolvedValue({
    data: {
      customers: null,
      waitlist: null,
      orders: null,
      drafts: 3,
      recentAudit: [],
    },
    error: null,
  });
  expect(await getDashboard()).toEqual({
    ok: true,
    data: {
      customers: null,
      waitlist: null,
      orders: null,
      drafts: 3,
      recentAudit: [],
    },
  });
});
it("database failure is error rather than fabricated zero", async () => {
  m.rpc.mockResolvedValue({ data: null, error: { code: "XX000" } });
  expect(await getDashboard()).toMatchObject({
    ok: false,
    error: "UNAVAILABLE",
  });
});
