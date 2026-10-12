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
    const result = await registerWaitlistEmail(payload, insertWaitlistRecord);
    if (!result.ok) {
      const status = result.error === "invalid_email" ? 400 : 503;
      return Response.json(result, { status, headers: noStoreHeaders });
    }

    return Response.json(result, {
      status: result.state === "created" ? 201 : 200,
      headers: noStoreHeaders,
    });
  } catch {
    return Response.json(
      { ok: false, error: "temporarily_unavailable" },
      { status: 503, headers: noStoreHeaders },
    );
  }
}
