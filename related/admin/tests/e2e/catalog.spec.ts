import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { parseEnv } from "node:util";
import path from "node:path";
const local = parseEnv(
  readFileSync(
    process.env.LUMIQ_TEST_ENV_FILE ||
      path.resolve(
        __dirname,
        "../../../../.superpowers/sdd/2026-10-20-lumiq-admin-platform/a3.env",
      ),
    "utf8",
  ),
);
const backend = createClient(local.API_URL!, local.SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});
const origin = "http://127.0.0.1:4264";
const prefix = `c3-browser-${Date.now()}`,
  password = `Synthetic-${crypto.randomUUID()}!`;
const users: Record<string, { id: string; email: string }> = {};
function sql(query: string) {
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
test.beforeAll(async () => {
  // Durable backup survives a browser/test failure until afterAll restores it.
  sql(
    "create table private.c3_browser_offerings as select * from public.catalog_offerings; create table private.c3_browser_settings as select * from public.commerce_settings;",
  );
  for (const role of ["admin", "editor", "member"]) {
    const email = `${prefix}-${role}@example.invalid`;
    const { data, error } = await backend.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error("fixture creation failed");
    users[role] = { id: data.user.id, email };
    if (role !== "member") {
      const r = await backend
        .from("staff_memberships")
        .insert({ user_id: data.user.id, role, active: true });
      if (r.error) throw new Error("role fixture failed");
    }
  }
});
test.afterAll(async () => {
  sql(
    `delete from public.order_items where order_id in(select id from public.customer_orders where user_id='${users.member.id}');delete from public.customer_orders where user_id='${users.member.id}';update public.catalog_offerings c set currency=s.currency,unit_minor=s.unit_minor,confirmed=s.confirmed,enabled=s.enabled,version=s.version from private.c3_browser_offerings s where c.id=s.id;update public.commerce_settings c set orders_enabled=s.orders_enabled,approved_terms_release_id=s.approved_terms_release_id,approved_terms_fingerprint=s.approved_terms_fingerprint,version=s.version from private.c3_browser_settings s where c.singleton=s.singleton;drop table private.c3_browser_offerings,private.c3_browser_settings;`,
  );
  for (const user of Object.values(users)) {
    const r = await backend.auth.admin.deleteUser(user.id);
    if (r.error) throw new Error("fixture cleanup failed");
  }
});
test("admin confirms synthetic SKU with version/origin guards; actual customer JWT orders are idempotent", async ({
  page,
}) => {
  const anon = await page.request.post("/api/catalog/update", {
    headers: { origin },
    data: {},
  });
  expect(anon.status()).toBe(401);
  for (const role of ["editor", "admin"]) {
    await page.context().clearCookies();
    await page
      .context()
      .setExtraHTTPHeaders({
        "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::1`,
      });
    expect(
      (
        await page.request.post("/api/auth/signin", {
          headers: { origin },
          data: { email: users[role].email, password },
        })
      ).status(),
    ).toBe(200);
    if (role === "editor")
      expect(
        (
          await page.request.post("/api/catalog/update", {
            headers: { origin },
            data: {},
          })
        ).status(),
      ).toBe(403);
  }
  await page.goto("/catalog");
  await expect(
    page.getByRole("heading", { name: "产品与方案", exact: true }),
  ).toBeVisible();
  for (const width of [1440, 320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      page.getByText("当前仅保存待付款配置订单。", { exact: false }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/catalog-${width}.png`,
      fullPage: true,
    });
  }
  const section = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "LumiQ Ola", exact: true }),
    });
  await section.getByLabel("币种", { exact: true }).selectOption("USD");
  await section.getByLabel("单价（币种最小单位整数）").fill("123");
  await section.getByLabel("我已确认此 SKU 的实际商业价格").check();
  await section.getByLabel("允许此 SKU 下单").check();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let reached!: () => void;
  const started = new Promise<void>((resolve) => (reached = resolve));
  await page.route("**/api/catalog/update", async (route) => {
    const response = await route.fetch();
    reached();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await section
      .getByRole("button", { name: "保存 LumiQ Ola", exact: true })
      .click();
    await started;
    await expect(section.getByLabel("单价（币种最小单位整数）")).toBeDisabled();
  } finally {
    release();
  }
  await expect(
    section.getByText("商业价格已确认", { exact: false }),
  ).toBeVisible();
  await page.unroute("**/api/catalog/update");
  const admin = createClient(local.API_URL!, local.ANON_KEY!, {
    auth: { persistSession: false },
  });
  expect(
    (
      await admin.auth.signInWithPassword({
        email: users.admin.email,
        password,
      })
    ).error,
  ).toBeNull();
  const workspace = await admin.rpc("get_catalog_workspace");
  expect(workspace.error).toBeNull();
  const offering = workspace.data.offerings.find(
    (v: { productId: string }) => v.productId === "ola",
  );
  expect(
    (
      await page.request.post("/api/catalog/update", {
        headers: { origin: "https://invalid.example" },
        data: {
          skuId: offering.skuId,
          currency: "USD",
          unitMinor: 1,
          confirmed: true,
          enabled: true,
          expectedVersion: offering.version,
        },
      })
    ).status(),
  ).toBe(403);
  const conflict = await page.request.post("/api/catalog/update", {
    headers: { origin },
    data: {
      skuId: offering.skuId,
      currency: "USD",
      unitMinor: 1,
      confirmed: true,
      enabled: true,
      expectedVersion: offering.version - 1,
    },
  });
  expect(conflict.status()).toBe(409);
  await page.getByLabel("我已审核并批准当前已发布的三种语言商业条款").check();
  await page.getByLabel("开放订单提交").check();
  await page.getByRole("button", { name: "保存订单设置" }).click();
  await expect(page.getByText("订单提交已开放")).toBeVisible();
  const customer = createClient(local.API_URL!, local.ANON_KEY!, {
    auth: { persistSession: false },
  });
  expect(
    (
      await customer.auth.signInWithPassword({
        email: users.member.email,
        password,
      })
    ).error,
  ).toBeNull();
  const request = {
    idempotencyKey: "browser-order-key",
    items: [{ skuId: offering.skuId, quantity: 2 }],
    shippingAddress: {
      name: "Synthetic",
      country: "US",
      region: "CA",
      city: "Test",
      postalCode: "123",
      line1: "Test",
      line2: "",
      phone: "",
    },
    termsVersion: workspace.data.publishedReleaseId,
  };
  const first = await customer.rpc("create_customer_order", { request });
  expect(first.error).toBeNull();
  expect(first.data.order.totals).toEqual({
    itemsMinor: 246,
    shippingMinor: null,
    taxMinor: null,
    payableMinor: null,
  });
  const second = await customer.rpc("create_customer_order", { request });
  expect(second.error).toBeNull();
  expect(second.data.order.id).toBe(first.data.order.id);
  expect(second.data.reused).toBe(true);
  expect(
    (
      await customer.rpc("create_customer_order", {
        request: { ...request, unitMinor: 1 },
      })
    ).error?.code,
  ).toBe("22023");
  expect(
    (
      await customer.rpc("cancel_customer_order", {
        order_id: first.data.order.id,
      })
    ).data.status,
  ).toBe("cancelled");
  expect(
    (await customer.rpc("create_customer_order", { request })).data.order
      .status,
  ).toBe("cancelled");
});
