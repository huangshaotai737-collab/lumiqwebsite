import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insertWaitlistRecord: vi.fn(),
  hasSupabaseServerConfig: vi.fn(),
}));

vi.mock("@/lib/supabase-server", () => ({
  insertWaitlistRecord: mocks.insertWaitlistRecord,
  hasSupabaseServerConfig: mocks.hasSupabaseServerConfig,
}));

import { POST } from "@/app/api/waitlist/route";

function request(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("POST /api/waitlist", () => {
  it("rejects invalid email before checking storage configuration", async () => {
    const response = await POST(request({ email: "invalid", website: "" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: "invalid_email",
    });
    expect(mocks.hasSupabaseServerConfig).not.toHaveBeenCalled();
  });

  it("returns a generic error when storage is unavailable", async () => {
    mocks.hasSupabaseServerConfig.mockReturnValue(true);
    mocks.insertWaitlistRecord.mockRejectedValue(
      new Error("secret database detail"),
    );

    const response = await POST(
      request({ email: "person@example.com", website: "" }),
    );
    const body = JSON.stringify(await response.json());

    expect(response.status).toBe(503);
    expect(body).toContain("temporarily_unavailable");
    expect(body).not.toContain("secret database detail");
  });

  it("accepts honeypot submissions without touching storage", async () => {
    const response = await POST(
      request({ email: "bot@example.com", website: "https://spam.example" }),
    );

    expect(response.status).toBe(201);
    expect(mocks.hasSupabaseServerConfig).not.toHaveBeenCalled();
    expect(mocks.insertWaitlistRecord).not.toHaveBeenCalled();
  });
});
