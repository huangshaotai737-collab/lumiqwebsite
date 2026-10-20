import { createHmac } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import {
  setup,
  cleanup,
  configure,
  users,
  password,
  customer,
  address,
  sql,
  backend,
} from "../support/order-fixtures";
import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import path from "node:path";
const local = parseEnv(
  readFileSync(
    process.env.LUMIQ_TEST_ENV_FILE ||
      path.resolve(
        __dirname,
        "../../../../.lumiq-local/test.env",
      ),
    "utf8",
  ),
);
if (local.API_URL && local.API_URL !== 'http://127.0.0.1:54321') throw Error('Only synthetic local backend is allowed');

const limitSubjects: string[] = [];
let originalAccessToken = "";
const origin = "http://127.0.0.1:4267";
let orderId = "";
let member: Awaited<ReturnType<typeof customer>>;
let jobId = "";
test.beforeAll(async () => {
  await setup();
  sql(
    "create table private.c6_browser_policy as select * from private.customer_privacy_policy",
  );
  const catalog = await configure();
  member = await customer();
  originalAccessToken = (await member.auth.getSession()).data.session!
    .access_token;
  const r = await member.rpc("create_customer_order", {
    request: {
      idempotencyKey: "c6-" + crypto.randomUUID(),
      items: [{ skuId: catalog.offerings[0].skuId, quantity: 1 }],
      shippingAddress: address,
      termsVersion: catalog.terms.releaseId,
    },
  });
  if (r.error) throw Error("order fixture failed");
  orderId = r.data.order.id;
  const updated = await backend.auth.admin.updateUserById(users.a.id, {
    user_metadata: {
      name: "Synthetic private name",
      nested: { address: "Synthetic private address" },
    },
    app_metadata: { privateContact: { phone: "Synthetic private phone" } },
  });
  if (updated.error) throw Error("metadata fixture failed");
  await backend
    .from("profiles")
    .update({
      display_name: "Synthetic private name",
      shipping_address: address,
    })
    .eq("user_id", users.a.id);
  sql(
    `insert into public.customer_notes(user_id,note,created_by)values('${users.a.id}','Synthetic customer note','${users.admin.id}');insert into public.order_notes(order_id,note,created_by)values('${orderId}','Synthetic order note','${users.admin.id}');`,
  );
});
test.afterAll(async () => {
  try {
    sql(
      `drop trigger if exists c6_auth_failure on auth.users;drop function if exists private.c6_auth_failure();delete from public.customer_privacy_jobs where user_id in('${users.a?.id}','${users.b?.id}');update private.customer_privacy_policy p set enabled=b.enabled,revision=b.revision from private.c6_browser_policy b where p.singleton=b.singleton;drop table private.c6_browser_policy;`,
    );
  } finally {
    try {
      // A failure before anonymization leaves notes referencing the staff author.
      // Delete only notes whose target and author are owned by this fixture.
      const ids = Object.values(users).map((u) => "'" + u.id + "'").join(",");
      try {
        if (ids) sql(`delete from public.customer_notes where user_id in(${ids}) and created_by in(${ids})`);
      } finally {
        await cleanup();
      }
    } finally {
      const subjects = [
        ...limitSubjects,
        ...Object.values(users).map((u) => u.id),
      ];
      if (subjects.length)
        sql(
          `delete from private.request_limits where subject_hash in(${subjects.map((value) => "'" + createHmac("sha256", "lumiq-synthetic-auth-e2e-shared-salt-20261020").update(value).digest("hex") + "'").join(",")})`,
        );
    }
  }
});
async function login(page: Page, role: string) {
  await page.context().clearCookies();
  const ip = `2001:db8:${crypto.randomUUID().slice(0, 4)}::6`;
  limitSubjects.push(ip);
  await page.context().setExtraHTTPHeaders({ "x-real-ip": ip });
  expect(
    (
      await page.request.post("/api/auth/signin", {
        headers: { origin },
        data: { email: users[role].email, password },
      })
    ).status(),
  ).toBe(200);
}
test("closed policy, actual Auth failure, durable resume, private-data erasure and real scoped dashboard", async ({
  page,
}) => {
  await login(page, "editor");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "内容草稿", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "会员", exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get("/api/customers/anonymize")).status()).toBe(
    403,
  );
  await login(page, "operations");
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "订单", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "内容草稿", exact: true }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.post("/api/customers/anonymize", {
        headers: { origin },
        data: { userId: users.a.id, reason: "customer_request" },
      })
    ).status(),
  ).toBe(403);
  await login(page, "admin");
  await page.goto("/customers");
  await expect(
    page.getByRole("button", { name: "匿名化客户资料", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("保留规则尚未由品牌确认，匿名化与恢复操作已关闭。"),
  ).toBeVisible();
  expect(
    (
      await page.request.post("/api/customers/anonymize", {
        headers: { origin },
        data: { userId: users.a.id, reason: "customer_request" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/customers/anonymize", {
        headers: { origin },
        data: {
          userId: users.a.id,
          reason: "customer_request",
          policy: "confirmed",
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/customers/anonymize", {
        headers: { origin: "https://other.invalid" },
        data: { userId: users.a.id, reason: "customer_request" },
      })
    ).status(),
  ).toBe(403);
  sql(
    `update private.customer_privacy_policy set enabled=true,revision='isolated-browser-only';create function private.c6_auth_failure() returns trigger language plpgsql as $$begin if new.id='${users.a.id}' and new.email like 'erased-%' then raise exception 'synthetic contact failure';end if;return new;end;$$;create trigger c6_auth_failure before update on auth.users for each row execute function private.c6_auth_failure();`,
  );
  const failed = await page.request.post("/api/customers/anonymize", {
    headers: { origin },
    data: { userId: users.a.id, reason: "customer_request" },
  });
  expect(failed.status()).toBe(200);
  const f = await failed.json();
  expect(f.ok).toBe(true);
  expect(f.data.status).toBe("failed");
  jobId = f.data.jobId;
  expect(
    sql(
      `select status||'/'||auth_banned||'/'||auth_cleared||'/'||failure_step from public.customer_privacy_jobs where id='${jobId}'`,
    ),
  ).toBe("failed/true/false/auth_contact");
  expect((await member.from("profiles").select("*")).data).toEqual([]);
  expect((await member.from("customer_orders").select("*")).data).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "认证联系资料未清理完成，请检查服务商或人工处理范围。", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "恢复任务", exact: true }),
  ).toBeVisible();
  sql(
    "drop trigger c6_auth_failure on auth.users;drop function private.c6_auth_failure();",
  );
  await page.getByRole("button", { name: "恢复任务", exact: true }).click();
  await expect(
    page.getByText(
      "应用资料已匿名化；服务商日志、备份和独立报名记录不在清理范围。",
      { exact: true },
    ),
  ).toBeVisible();
  const verified = await backend.auth.admin.getUserById(users.a.id);
  expect(verified.error).toBeNull();
  expect(verified.data.user?.id).toBe(users.a.id);
  expect(verified.data.user?.email).toBe(
    `erased-${users.a.id}@example.invalid`,
  );
  expect(verified.data.user?.phone || "").toBe("");
  expect(
    Object.keys(verified.data.user?.user_metadata || {}).filter(
      (k) => k !== "email_verified",
    ),
  ).toEqual([]);
  expect(
    Object.keys(verified.data.user?.app_metadata || {}).filter(
      (k) => !["provider", "providers"].includes(k),
    ),
  ).toEqual([]);
  expect(verified.data.user?.identities?.[0].identity_data?.email).toBe(
    `erased-${users.a.id}@example.invalid`,
  );
  const staleUpdate = await member.auth.updateUser({
    data: { name: "restored private name" },
  });
  expect(staleUpdate.error?.status).toBe(403);
  expect(staleUpdate.error?.code).toBe("user_banned");
  const rawStale = await page.request.put(`${local.API_URL}/auth/v1/user`, {
    headers: {
      apikey: local.ANON_KEY!,
      Authorization: `Bearer ${originalAccessToken}`,
    },
    data: {
      email: "c6-restored@example.invalid",
      phone: "+12025550123",
      data: { name: "restored private name" },
    },
  });
  expect(rawStale.status()).toBe(403);
  expect((await rawStale.json()).error_code).toBe("user_banned");
  const afterStale = await backend.auth.admin.getUserById(users.a.id);
  expect(afterStale.data.user?.email).toBe(
    `erased-${users.a.id}@example.invalid`,
  );
  expect(afterStale.data.user?.phone || "").toBe("");
  expect(afterStale.data.user?.user_metadata.name).toBeUndefined();
  expect(
    sql(
      `select display_name||shipping_address::text||access_state from public.profiles where user_id='${users.a.id}'`,
    ),
  ).toBe("{}anonymized");
  expect(
    sql(
      `select shipping_address::text from public.customer_orders where id='${orderId}'`,
    ),
  ).toBe("{}");
  expect(
    sql(
      `select count(*) from public.customer_notes where user_id='${users.a.id}'`,
    ),
  ).toBe("0");
  expect(
    sql(`select count(*) from public.order_notes where order_id='${orderId}'`),
  ).toBe("0");
  expect(
    sql(`select count(*) from public.order_items where order_id='${orderId}'`),
  ).toBe("1");
  const again = await page.request.post("/api/customers/anonymize", {
    headers: { origin },
    data: { jobId },
  });
  expect((await again.json()).data.status).toBe("completed");
  await page.reload();
  await expect(
    page.getByRole("cell", { name: "已完成", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "恢复任务", exact: true }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "../../.lumiq-local/evidence/c6/privacy-mobile.png",
    fullPage: true,
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "会员", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "订单", exact: true }),
  ).toBeVisible();
});
