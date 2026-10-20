import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
import path from "node:path";
const env = parseEnv(
  readFileSync(
    process.env.LUMIQ_TEST_ENV_FILE ||
      path.resolve(
        __dirname,
        "../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/a3.env",
      ),
    "utf8",
  ),
);
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(env.API_URL!))
  throw Error("Local test only");
export const backend = createClient(env.API_URL!, env.SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
export const password = `Synthetic-${crypto.randomUUID()}!`;
export const users: Record<string, { id: string; email: string }> = {};
export function sql(query: string) {
  return execFileSync(
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
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: query,
      encoding: "utf8",
      env: {
        ...process.env,
        DOCKER_HOST:
          "unix:///Users/huangshaotai/.colima/lumiq-platform/docker.sock",
      },
    },
  ).trim();
}
export async function setup() {
  sql(
    "create table private.c4_browser_offerings as select * from public.catalog_offerings;create table private.c4_browser_settings as select * from public.commerce_settings;",
  );
  const prefix = `c4-browser-${Date.now()}`;
  for (const role of [
    "admin",
    "operations",
    "editor",
    "a",
    "b",
    "unverified",
  ]) {
    const email = `${prefix}-${role}@example.invalid`;
    const r = await backend.auth.admin.createUser({
      email,
      password,
      email_confirm: role !== "unverified",
    });
    if (r.error || !r.data.user) throw Error("fixture creation failed");
    users[role] = { id: r.data.user.id, email };
    if (["admin", "operations", "editor"].includes(role)) {
      const r2 = await backend
        .from("staff_memberships")
        .insert({ user_id: users[role].id, role, active: true });
      if (r2.error) throw Error("role fixture failed");
    }
  }
}
export async function customer(role = "a") {
  const client = createClient(env.API_URL!, env.ANON_KEY!, {
    auth: { persistSession: false },
  });
  const r = await client.auth.signInWithPassword({
    email: users[role].email,
    password,
  });
  if (r.error) throw Error("fixture auth failed");
  return client;
}
export async function configure() {
  const c = await customer("admin");
  const w = await c.rpc("get_catalog_workspace");
  if (w.error) throw Error("catalog fixture failed");
  const data = w.data;
  const offer = data.offerings.find(
    (o: { productId: string }) => o.productId === "ola",
  );
  for (const [name, args] of [
    [
      "set_catalog_offering",
      {
        sku_id: offer.skuId,
        currency: "USD",
        unit_minor: 123,
        confirmed: true,
        enabled: true,
        expected_version: offer.version,
      },
    ],
    [
      "update_commerce_settings",
      {
        orders_enabled: true,
        terms_release_id: data.publishedReleaseId,
        expected_version: data.settings.version,
      },
    ],
  ] as const) {
    const r = await c.rpc(name, args);
    if (r.error) throw Error("commerce fixture failed");
  }
  const catalog = await c.rpc("get_ordering_catalog");
  if (catalog.error) throw Error("public fixture failed");
  return catalog.data;
}
export async function cleanup() {
  const ids = Object.values(users)
    .map((u) => `'${u.id}'`)
    .join(",");
  if (ids)
    sql(
      `delete from public.order_notes where order_id in(select id from public.customer_orders where user_id in(${ids}));delete from public.order_items where order_id in(select id from public.customer_orders where user_id in(${ids}));delete from public.customer_orders where user_id in(${ids});`,
    );
  sql(
    "update public.catalog_offerings c set currency=s.currency,unit_minor=s.unit_minor,confirmed=s.confirmed,enabled=s.enabled,version=s.version from private.c4_browser_offerings s where c.id=s.id;update public.commerce_settings c set orders_enabled=s.orders_enabled,approved_terms_release_id=s.approved_terms_release_id,approved_terms_fingerprint=s.approved_terms_fingerprint,version=s.version from private.c4_browser_settings s where c.singleton=s.singleton;drop table private.c4_browser_offerings,private.c4_browser_settings;",
  );
  for (const u of Object.values(users)) {
    const r = await backend.auth.admin.deleteUser(u.id);
    if (r.error) throw Error("fixture cleanup failed");
  }
}
export const address = {
  name: "Synthetic Recipient",
  country: "US",
  region: "CA",
  city: "Test City",
  postalCode: "12345",
  line1: "Synthetic street",
  line2: "",
  phone: "",
};
