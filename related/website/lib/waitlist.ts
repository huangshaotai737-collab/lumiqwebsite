export const WAITLIST_CONSENT_VERSION = "waitlist-v1";
export const WAITLIST_SOURCE = "prelaunch";

export type WaitlistSuccessState = "created" | "already_registered";

export type WaitlistInsertResult =
  { ok: true } | { ok: false; duplicate?: boolean };

export type WaitlistRegistrationResult =
  | { ok: true; state: WaitlistSuccessState; isBot?: boolean }
  | { ok: false; error: "invalid_email" | "temporarily_unavailable" };

export type WaitlistRecord = {
  email: string;
  source: typeof WAITLIST_SOURCE;
  consent_version: typeof WAITLIST_CONSENT_VERSION;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return value.length > 0 && value.length <= 254 && EMAIL_PATTERN.test(value);
}

export function parseWaitlistRequest(
  input: unknown,
):
  | { ok: true; email: string; isBot: boolean }
  | { ok: false; error: "invalid_email" } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "invalid_email" };
  }

  const payload = input as Record<string, unknown>;
  const website =
    typeof payload.website === "string" ? payload.website.trim() : "";
  const email =
    typeof payload.email === "string" ? normalizeEmail(payload.email) : "";

  if (website) {
    return { ok: true, email, isBot: true };
  }

  if (!isValidEmail(email)) {
    return { ok: false, error: "invalid_email" };
  }

  return { ok: true, email, isBot: false };
}

export async function registerWaitlistEmail(
  input: unknown,
  insert: (record: WaitlistRecord) => Promise<WaitlistInsertResult>,
): Promise<WaitlistRegistrationResult> {
  const parsed = parseWaitlistRequest(input);

  if (!parsed.ok) return parsed;
  if (parsed.isBot) return { ok: true, state: "created", isBot: true };

  const result = await insert({
    email: parsed.email,
    source: WAITLIST_SOURCE,
    consent_version: WAITLIST_CONSENT_VERSION,
  });

  if (result.ok) return { ok: true, state: "created" };
  if (result.duplicate) return { ok: true, state: "already_registered" };
  return { ok: false, error: "temporarily_unavailable" };
}
