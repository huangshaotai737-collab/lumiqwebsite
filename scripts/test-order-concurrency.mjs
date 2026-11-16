// Local synthetic Postgres only. Restore durable backups even when psql exits before SQL cleanup.
import { spawnSync } from "node:child_process";
if (!process.argv.includes("--local-test-only"))
  throw new Error("LOCAL_TEST_ONLY_REQUIRED");
const env = {
  ...process.env,
  ...(process.env.DOCKER_HOST ? {DOCKER_HOST:process.env.DOCKER_HOST} : {}),
};
let result;
try {
  result = spawnSync(
    "supabase",
    ["test", "db", "supabase/tests/database/order-concurrency.test.sql"],
    { env, stdio: "inherit" },
  );
} finally {
  const restore = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_lumiq-platform",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      env,
      encoding: "utf8",
      input: `
 begin;
 do $$begin
 if to_regclass('private.c3_saved_offerings') is not null then
  update public.catalog_offerings c set currency=s.currency,unit_minor=s.unit_minor,confirmed=s.confirmed,enabled=s.enabled,version=s.version from private.c3_saved_offerings s where c.id=s.id;
  update public.commerce_settings c set orders_enabled=s.orders_enabled,approved_terms_release_id=s.approved_terms_release_id,approved_terms_fingerprint=s.approved_terms_fingerprint,version=s.version from private.c3_saved_settings s where c.singleton=s.singleton;
  update public.content_publication c set release_id=s.release_id,updated_at=s.updated_at from private.c3_saved_publication s where c.singleton=s.singleton;
  delete from public.order_items where order_id in(select id from public.customer_orders where user_id='b3000000-0000-4000-8000-000000000002');
  delete from public.customer_orders where user_id='b3000000-0000-4000-8000-000000000002';
  delete from auth.users where id in('b3000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000002');
  drop table private.c3_saved_offerings,private.c3_saved_settings,private.c3_saved_publication;
 end if;
 end$$;
 commit;`,
    },
  );
  if (restore.status !== 0)
    throw new Error("CONCURRENCY_FIXTURE_RESTORATION_FAILED");
}
process.exitCode = result?.status ?? 1;
