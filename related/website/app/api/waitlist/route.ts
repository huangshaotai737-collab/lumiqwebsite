import { assertSameOrigin } from "@/lib/http/origin";
import { enforceRateLimit, clientAddress } from "@/lib/http/rate-limit";
import { HttpError } from "@/lib/http/result";
import {
  insertWaitlistRecord,
  hasSupabaseServerConfig,
} from "@/lib/supabase-server";
import { parseWaitlistRequest, registerWaitlistEmail } from "@/lib/waitlist";

export const runtime = "nodejs";

const noStoreHeaders = {
  "Cache-Control": "no-store",
};

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "invalid_email" },
      { status: 400, headers: noStoreHeaders },
    );
  }

  const parsed = parseWaitlistRequest(payload);

  if (!parsed.ok) {
    return Response.json(parsed, { status: 400, headers: noStoreHeaders });
  }

  if (parsed.isBot) {
    return Response.json(
      { ok: true, state: "created" },
      { status: 201, headers: noStoreHeaders },
    );
  }

  if (!hasSupabaseServerConfig()) {
    return Response.json(
      { ok: false, error: "temporarily_unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }

  try {
    assertSameOrigin(request, process.env.APP_ORIGIN || "");
    await enforceRateLimit("waitlist", clientAddress(request));
    const result = await registerWaitlistEmail(payload, insertWaitlistRecord);
    if (!result.ok) {
      const status = result.error === "invalid_email" ? 400 : 503;
      return Response.json(result, { status, headers: noStoreHeaders });
    }

    return Response.json(result, {
      status: result.state === "created" ? 201 : 200,
      headers: noStoreHeaders,
    });
  } catch (error) {
    if (error instanceof HttpError && error.code === "FORBIDDEN")
      return Response.json(
        { ok: false, error: "temporarily_unavailable" },
        { status: 403, headers: noStoreHeaders },
      );
    if (error instanceof HttpError && error.code === "RATE_LIMITED")
      return Response.json(
        { ok: false, error: "temporarily_unavailable" },
        {
          status: 429,
          headers: {
            ...noStoreHeaders,
            "Retry-After": String(error.retryAfterSeconds || 900),
          },
        },
      );
    return Response.json(
      { ok: false, error: "temporarily_unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
