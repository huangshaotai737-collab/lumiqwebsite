import { createClient } from "@supabase/supabase-js";
import type { WaitlistInsertResult, WaitlistRecord } from "@/lib/waitlist";

export function hasSupabaseServerConfig() {
  return Boolean(
    process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export async function insertWaitlistRecord(
  record: WaitlistRecord,
): Promise<WaitlistInsertResult> {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return { ok: false };

  const supabase = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase.from("waitlist_signups").insert(record);

  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: false, duplicate: true };
  return { ok: false };
}
