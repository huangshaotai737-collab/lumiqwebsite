import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
/** Shared, local-only fixture lifecycle. Each app supplies its own installed SDK. */
export function createOrderFixtures({
  createClient,
  envFile,
  runSql = undefined,
}) {
  const env = parseEnv(readFileSync(envFile, "utf8"));
  let backedUp = false;
  let endpoint;
  try {
    endpoint = new URL(env.API_URL);
  } catch {
    throw Error("Local test only");
  }
  if (
    endpoint.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(endpoint.hostname) ||
    endpoint.username ||
    endpoint.password
  )
    throw Error("Local test only");
  const backend = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const password = `Synthetic-${crypto.randomUUID()}!`;
  /** @type {Record<string,{id:string,email:string}>} */
  const users = {};
  function sql(query) {
    if (runSql) return runSql(query);
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
          ...(process.env.DOCKER_HOST ? {DOCKER_HOST:process.env.DOCKER_HOST} : {}),
        },
      },
    ).trim();
  }
  async function setup() {
    sql(
      "begin;create table private.c4_browser_offerings as select * from public.catalog_offerings;create table private.c4_browser_settings as select * from public.commerce_settings;create table private.c4_browser_publication as select * from public.content_publication;commit;",
    );
    backedUp = true;
    try {
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
    } catch (error) {
      await cleanup();
      throw error;
    }
  }
  async function customer(role = "a") {
    const client = createClient(env.API_URL, env.ANON_KEY, {
      auth: { persistSession: false },
    });
    const r = await client.auth.signInWithPassword({
      email: users[role].email,
      password,
    });
    if (r.error) throw Error("fixture auth failed");
    return client;
  }
  async function configure() {
    const c = await customer("admin");
    const w = await c.rpc("get_catalog_workspace");
    if (w.error) throw Error("catalog fixture failed");
    const data = w.data;
    const offer = data.offerings.find((o) => o.productId === "ola");
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
    ]) {
      const r = await c.rpc(name, args);
      if (r.error) throw Error("commerce fixture failed");
    }
    const catalog = await c.rpc("get_ordering_catalog");
    if (catalog.error) throw Error("public fixture failed");
    return catalog.data;
  }
  async function cleanup() {
    const failures = [];
    try {
      const ids = Object.values(users)
        .map((u) => `'${u.id}'`)
        .join(",");
      if (ids)
        sql(
          `delete from public.order_notes where order_id in(select id from public.customer_orders where user_id in(${ids}));delete from public.order_items where order_id in(select id from public.customer_orders where user_id in(${ids}));delete from public.customer_orders where user_id in(${ids});`,
        );
    } catch {
      failures.push("order cleanup failed");
    } finally {
      try {
        if (backedUp) {
          sql(
            "begin;update public.catalog_offerings c set currency=s.currency,unit_minor=s.unit_minor,confirmed=s.confirmed,enabled=s.enabled,version=s.version from private.c4_browser_offerings s where c.id=s.id;update public.commerce_settings c set orders_enabled=s.orders_enabled,approved_terms_release_id=s.approved_terms_release_id,approved_terms_fingerprint=s.approved_terms_fingerprint,version=s.version from private.c4_browser_settings s where c.singleton=s.singleton;update public.content_publication p set release_id=s.release_id,updated_at=s.updated_at from private.c4_browser_publication s where p.singleton=s.singleton;drop table private.c4_browser_offerings,private.c4_browser_settings,private.c4_browser_publication;commit;",
          );
          backedUp = false;
        }
      } catch {
        failures.push("durable fixture restoration failed");
      } finally {
        for (const [role, u] of Object.entries(users)) {
          try {
            const r = await backend.auth.admin.deleteUser(u.id);
            if (r.error) throw Error();
            delete users[role];
          } catch {
            failures.push("user cleanup failed");
          }
        }
      }
    }
    if (failures.length) throw new Error(failures.join("; "));
  }
  const address = {
    name: "Synthetic Recipient",
    country: "US",
    region: "CA",
    city: "Test City",
    postalCode: "12345",
    line1: "Synthetic street",
    line2: "",
    phone: "",
  };

  return {
    backend,
    password,
    users,
    sql,
    setup,
    customer,
    configure,
    cleanup,
    address,
  };
}
