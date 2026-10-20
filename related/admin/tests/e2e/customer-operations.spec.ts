import { expect, test, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
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
  auth: { persistSession: false, autoRefreshToken: false },
});
const origin = "http://127.0.0.1:4262";
const website = "http://127.0.0.1:4263";
const prefix = `c2-${Date.now()}`;
const email = `${prefix}-wait@example.invalid`;
const password = `Synthetic-${crypto.randomUUID()}!`;
const users: Record<string, { id: string; email: string }> = {};
test.beforeAll(async () => {
  for (const role of ["admin", "operations", "editor", "member"]) {
    const email = `${prefix}-${role}@example.invalid`;
    const { data, error } = await backend.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error("synthetic user creation failed");
    users[role] = { id: data.user.id, email };
    if (role !== "member") {
      const { error } = await backend
        .from("staff_memberships")
        .insert({ user_id: data.user.id, role, active: true });
      if (error) throw new Error("synthetic role creation failed");
    }
  }
});
test.afterAll(async () => {
  await backend.from("waitlist_signups").delete().like("email", `${prefix}%`);
  for (const user of [
    users.member,
    ...Object.entries(users)
      .filter(([role]) => role !== "member")
      .map(([, user]) => user),
  ].filter(Boolean)) {
    const { error } = await backend.auth.admin.deleteUser(user.id);
    if (error) throw new Error("synthetic user cleanup failed");
  }
});
async function login(context: BrowserContext, role: string) {
  if (role === "member") {
    const { data, error } = await createClient(
      local.API_URL!,
      local.ANON_KEY!,
      { auth: { persistSession: false } },
    ).auth.signInWithPassword({ email: users.member.email, password });
    expect(error).toBeNull();
    await context.clearCookies();
    await context.addCookies([
      {
        name: "lumiq-admin-auth",
        value:
          "base64-" +
          Buffer.from(JSON.stringify(data.session)).toString("base64url"),
        url: origin,
        sameSite: "Lax",
      },
    ]);
    return;
  }
  await context.setExtraHTTPHeaders({
    "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::2`,
  });
  const response = await context.request.post(origin + "/api/auth/signin", {
    headers: { origin },
    data: { email: users[role].email, password },
  });
  expect(response.status()).toBe(200);
}
test("real signup, dedup, staff permissions, notes, versions, CSV and audit", async ({
  browser,
  page,
  request,
}) => {
  const anon = await request.get(origin + "/api/waitlist/list");
  expect(anon.status()).toBe(401);
  const headers = {
    "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::1`,
    origin: website,
  };
  const first = await request.post(website + "/api/waitlist", {
    headers,
    data: { email, website: "" },
  });
  expect(first.status()).toBe(201);
  expect(await first.json()).toMatchObject({ ok: true, state: "created" });
  const duplicate = await request.post(website + "/api/waitlist", {
    headers,
    data: { email: email.toUpperCase(), website: "" },
  });
  expect(duplicate.status()).toBe(200);
  expect(await duplicate.json()).toMatchObject({
    ok: true,
    state: "already_registered",
  });
  const denied = await browser.newContext();
  for (const role of ["editor", "member"]) {
    await login(denied, role);
    const response = await denied.request.get(origin + "/api/waitlist/export");
    expect(response.status()).toBe(403);
    const customers = await denied.request.get(origin + "/api/customers/list");
    expect(customers.status()).toBe(403);
  }
  await denied.close();
  await login(page.context(), "operations");
  await page.goto("/waitlist");
  await page.getByLabel("邮箱搜索").fill(email);
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(page.getByText("共 1 条", { exact: false })).toBeVisible();
  await expect(page.getByRole("cell", { name: email })).toHaveCount(1);
  await page.getByLabel(`状态 ${email}`).selectOption("contacted");
  await page.getByLabel(`备注 ${email}`).fill('=1+1,"运营"\n下一行');
  await page.getByRole("button", { name: "保存处理", exact: true }).click();
  await expect
    .poll(async () => {
      const result = await (
        await page.request.get("/api/waitlist/list?search=" + email)
      ).json();
      return result.data.items[0].version;
    })
    .toBe(1);
  const listed = await (
    await page.request.get("/api/waitlist/list?search=" + email)
  ).json();
  const row = listed.data.items[0];
  expect(row.note).toBe('=1+1,"运营"\n下一行');
  const stale = await page.request.post("/api/waitlist/update", {
    headers: { origin },
    data: {
      id: row.id,
      status: "closed",
      note: "overwrite",
      expectedVersion: 0,
    },
  });
  expect(stale.status()).toBe(409);
  const exported = await page.request.get(
    "/api/waitlist/export?search=" +
      email +
      "&status=contacted&page=99&pageSize=1",
  );
  expect(exported.status()).toBe(200);
  expect(exported.headers()["content-type"]).toContain("text/csv");
  expect(await exported.text()).toContain("'=1+1," + '""运营""');
  const auditReader = createClient(local.API_URL!, local.ANON_KEY!, {
    auth: { persistSession: false },
  });
  expect(
    (
      await auditReader.auth.signInWithPassword({
        email: users.operations.email,
        password,
      })
    ).error,
  ).toBeNull();
  const audit = await auditReader
    .from("audit_events")
    .select("summary")
    .eq("actor_id", users.operations.id)
    .eq("action", "waitlist.exported");
  expect(audit.error).toBeNull();
  expect(audit.data).toHaveLength(1);
  expect(audit.data![0].summary).toMatchObject({
    hasSearch: true,
    rowCount: 1,
    status: "contacted",
  });
  expect(JSON.stringify(audit.data)).not.toContain(email);
  const memberList = await (
    await page.request.get("/api/customers/list?search=" + prefix)
  ).json();
  expect(memberList.data.total).toBe(1);
  expect(memberList.data.items[0].id).toBe(users.member.id);
  await page.goto("/customers");
  await page.getByLabel("姓名或邮箱").fill(users.member.email);
  await page.getByRole("button", { name: "搜索会员" }).click();
  await expect(
    page.getByRole("cell", { name: users.member.email }),
  ).toBeVisible();
  await page.getByRole("button", { name: "查看详情" }).click();
  await page.getByLabel("新增内部备注（最多2000字）").fill("运营跟进备注");
  await page.getByRole("button", { name: "保存备注" }).click();
  await expect(page.getByText("备注已保存。", { exact: true })).toBeVisible();
  await expect(page.getByText("运营跟进备注", { exact: true })).toBeVisible();
  const memberToken = await createClient(local.API_URL!, local.ANON_KEY!, {
    auth: { persistSession: false },
  }).auth.signInWithPassword({ email: users.member.email, password });
  const ordinary = createClient(local.API_URL!, local.ANON_KEY!, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${memberToken.data.session!.access_token}`,
      },
    },
  });
  expect(
    (await ordinary.from("customer_notes").select("*")).error,
  ).not.toBeNull();
  for (const width of [1440, 320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/waitlist");
    await page.getByLabel("邮箱搜索").fill(email);
    await page.getByRole("button", { name: "筛选", exact: true }).click();
    await expect(page.getByRole("cell", { name: email })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "筛选", exact: true }),
    ).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/customer-operations-${width}.png`,
      fullPage: true,
    });
    await page.goto("/customers");
    await page.getByLabel("姓名或邮箱").fill(users.member.email);
    await page.getByRole("button", { name: "搜索会员" }).click();
    await page.getByRole("button", { name: "查看详情" }).click();
    await expect(page.getByText("运营跟进备注", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/customer-detail-${width}.png`,
      fullPage: true,
    });
  }
  await page.goto("/waitlist");
  await page.getByLabel("邮箱搜索").fill(email);
  await page.getByRole("button", { name: "筛选", exact: true }).click();
  await expect(page.getByText("共 1 条", { exact: false })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出筛选结果，最多10000条" }).click();
  expect((await download).suggestedFilename()).toBe("lumiq-waitlist.csv");
  // A real API error must retain the last successful rows and cannot show a false empty state.
  await page.route("**/api/waitlist/list?**", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "UNAVAILABLE" }),
    }),
  );
  await page.getByRole("button", { name: "刷新列表" }).click();
  await expect(
    page.getByText("读取失败，当前显示上次成功结果。请重试。"),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: email })).toBeVisible();
  await page.unroute("**/api/waitlist/list?**");
  await page.route("**/api/waitlist/update", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: "UNAVAILABLE" }),
    }),
  );
  await page.getByLabel(`备注 ${email}`).fill("unsaved");
  await page.getByRole("button", { name: "保存处理" }).click();
  await expect(page.getByText("保存失败，请重试。")).toBeVisible();
  await page.unroute("**/api/waitlist/update");
  await login(page.context(), "admin");
  expect(
    (await page.request.get("/api/customers/list?search=" + prefix)).status(),
  ).toBe(200);
});
