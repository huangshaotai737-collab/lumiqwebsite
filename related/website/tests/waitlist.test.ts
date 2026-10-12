import { describe, expect, it, vi } from "vitest";
import {
  normalizeEmail,
  parseWaitlistRequest,
  registerWaitlistEmail,
  WAITLIST_CONSENT_VERSION,
  WAITLIST_SOURCE,
} from "@/lib/waitlist";

describe("waitlist input", () => {
  it("normalizes whitespace and letter case", () => {
    expect(normalizeEmail("  Person@Example.COM ")).toBe("person@example.com");
  });

  it.each([
    "",
    "missing-at.example.com",
    "missing-domain@",
    `${"a".repeat(245)}@example.com`,
  ])("rejects invalid email %s", (email) => {
    expect(parseWaitlistRequest({ email, website: "" })).toEqual({
      ok: false,
      error: "invalid_email",
    });
  });
});

describe("waitlist registration", () => {
  it("inserts a normalized record", async () => {
    const insert = vi.fn().mockResolvedValue({ ok: true });

    await expect(
      registerWaitlistEmail(
        { email: "  Person@Example.COM ", website: "" },
        insert,
      ),
    ).resolves.toEqual({ ok: true, state: "created" });

    expect(insert).toHaveBeenCalledWith({
      email: "person@example.com",
      source: WAITLIST_SOURCE,
      consent_version: WAITLIST_CONSENT_VERSION,
    });
  });

  it("treats duplicate email as a successful registration", async () => {
    const insert = vi.fn().mockResolvedValue({ ok: false, duplicate: true });

    await expect(
      registerWaitlistEmail(
        { email: "person@example.com", website: "" },
        insert,
      ),
    ).resolves.toEqual({ ok: true, state: "already_registered" });
  });

  it("converts storage errors into a generic service error", async () => {
    const insert = vi.fn().mockResolvedValue({ ok: false });

    await expect(
      registerWaitlistEmail(
        { email: "person@example.com", website: "" },
        insert,
      ),
    ).resolves.toEqual({ ok: false, error: "temporarily_unavailable" });
  });

  it("does not insert honeypot submissions", async () => {
    const insert = vi.fn();

    await expect(
      registerWaitlistEmail(
        { email: "person@example.com", website: "https://spam.example" },
        insert,
      ),
    ).resolves.toEqual({ ok: true, state: "created", isBot: true });

    expect(insert).not.toHaveBeenCalled();
  });
});
