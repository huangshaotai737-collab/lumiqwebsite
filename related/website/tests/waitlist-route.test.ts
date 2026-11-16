import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insertWaitlistRecord: vi.fn(),
  hasSupabaseServerConfig: vi.fn(),
  enforceRateLimit: vi.fn(),
  clientAddress: vi.fn(() => "test-ip"),
}));

vi.mock("@/lib/supabase-server", () => ({
  insertWaitlistRecord: mocks.insertWaitlistRecord,
  hasSupabaseServerConfig: mocks.hasSupabaseServerConfig,
}));

vi.mock("@/lib/http/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  clientAddress: mocks.clientAddress,
}));

import { POST } from "@/app/api/waitlist/route";

function request(body: unknown) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "http://localhost" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => vi.stubEnv("APP_ORIGIN", "http://localhost"));

afterEach(() => {
  vi.unstubAllEnvs();
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

it("limits real signup attempts before storage and fails closed", async () => {
  mocks.hasSupabaseServerConfig.mockReturnValue(true);
  const { HttpError } = await import("@/lib/http/result");
  mocks.enforceRateLimit.mockRejectedValue(
    new HttpError("RATE_LIMITED", 429, 900),
  );
  const response = await POST(
    request({ email: "c2@example.invalid", website: "" }),
  );
  expect(response.status).toBe(429);
  expect(mocks.enforceRateLimit).toHaveBeenCalledWith(
    "waitlist",
    expect.anything(),
  );
  expect(mocks.insertWaitlistRecord).not.toHaveBeenCalled();
});

it("rejects cross-origin real writes without inserting", async () => {
  vi.stubEnv("APP_ORIGIN", "http://localhost");
  mocks.hasSupabaseServerConfig.mockReturnValue(true);
  mocks.insertWaitlistRecord.mockResolvedValue({ ok: true });
  const response = await POST(
    new Request(request({ email: "origin@example.invalid", website: "" }), {
      headers: { origin: "https://other.example" },
    }),
  );
  expect(response.status).toBe(403);
  expect(mocks.insertWaitlistRecord).not.toHaveBeenCalled();
});

it("keeps created/duplicate response and original consent insertion semantics", async () => {
  vi.stubEnv("APP_ORIGIN", "http://localhost");
  mocks.hasSupabaseServerConfig.mockReturnValue(true);
  mocks.insertWaitlistRecord
    .mockResolvedValueOnce({ ok: true })
    .mockResolvedValueOnce({ ok: false, duplicate: true });
  expect(
    (await POST(request({ email: " Person@Example.Invalid ", website: "" })))
      .status,
  ).toBe(201);
  const duplicate = await POST(
    request({ email: "person@example.invalid", website: "" }),
  );
  expect(duplicate.status).toBe(200);
  expect(await duplicate.json()).toEqual({
    ok: true,
    state: "already_registered",
  });
  expect(mocks.insertWaitlistRecord).toHaveBeenCalledWith({
    email: "person@example.invalid",
    source: "prelaunch",
    consent_version: "waitlist-v1",
  });
});
