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
} from "../support/order-fixtures";
const origin = "http://127.0.0.1:4266";
let orderId = "";
test.beforeAll(async () => {
  await setup();
  const catalog = await configure();
  const member = await customer();
  const r = await member.rpc("create_customer_order", {
    request: {
      idempotencyKey: "c4-ops-" + crypto.randomUUID(),
      items: [{ skuId: catalog.offerings[0].skuId, quantity: 1 }],
      shippingAddress: address,
      termsVersion: catalog.terms.releaseId,
    },
  });
  if (r.error) throw Error("order fixture");
  orderId = r.data.order.id;
  await member.rpc("cancel_customer_order", { order_id: orderId });
});
test.afterAll(cleanup);
async function login(page: Page, role: string) {
  await page.context().clearCookies();
  await page.context().setExtraHTTPHeaders({
    "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::6`,
  });
  expect(
    (
      await page.request.post("/api/auth/signin", {
        headers: { origin },
        data: { email: users[role].email, password },
      })
    ).status(),
  ).toBe(200);
}
test("operations/admin search cancelled order and append private audited note; editor/member denied", async ({
  page,
}) => {
  expect((await page.request.get("/api/orders")).status()).toBe(401);
  await login(page, "editor");
  await page.goto(`/orders/${orderId}`);
  await expect(page.locator("p[role=alert]")).toContainText("沒有運營權限");
  await expect(
    page.getByText("Synthetic Recipient", { exact: true }),
  ).toHaveCount(0);
  expect((await page.request.get("/api/orders")).status()).toBe(403);
  for (const role of ["operations", "admin"]) {
    await login(page, role);
    await page.goto("/orders");
    await expect(
      page.getByRole("heading", { name: "訂單運營", exact: true }),
    ).toBeVisible();
    await page.getByLabel("訂單或會員 ID").fill(orderId);
    await page.getByLabel("狀態", { exact: true }).selectOption("cancelled");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await page.getByRole("link", { name: orderId, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "訂單詳情", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Synthetic Recipient", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("取消記錄：尚無取消記錄", { exact: true }),
    ).toHaveCount(0);
    expect(
      (
        await page.request.post(`/api/orders/${orderId}/notes`, {
          headers: { origin: "https://other.invalid" },
          data: { note: "forbidden" },
        })
      ).status(),
    ).toBe(403);
    const note = `Internal ${role} synthetic note`;
    await page.getByLabel("添加內部備註").fill(note);
    await page.getByRole("button", { name: "保存備註", exact: true }).click();
    await expect(page.getByText(note, { exact: true })).toBeVisible();
    console.log("NOTE_AUDIT",role,users[role].id,sql(`select json_agg(json_build_object('action',action,'actor',actor_id,'entity',entity_id)) from public.audit_events where action='orders.note_added'`));
    console.log("NOTE_UI",await page.locator("main").innerText());
    expect(
      sql(
        `select count(*) from public.audit_events where action='orders.note_added' and entity_id='${orderId}' and actor_id='${users[role].id}'`,
      ),
    ).toBe("1");
  }
  await page.setViewportSize({ width: 390, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/order-operations-390.png",
    fullPage: true,
  });
  const member = await customer();
  for (const rpc of ["get_staff_order", "get_staff_order_detail"])
    expect((await member.rpc(rpc, { order_id: orderId })).error?.code).toBe(
      "42501",
    );
  const own = await member.rpc("get_customer_order", { order_id: orderId });
  expect(own.error).toBeNull();
  expect(JSON.stringify(own.data)).not.toContain("Internal");
  expect(JSON.stringify(own.data)).not.toContain("notes");
  expect((await member.from("order_notes").select("*")).error?.code).toBe(
    "42501",
  );
  // Same authenticated token loses authority immediately when database staff state changes.
  const operations = await customer("operations");
  sql(
    `update public.staff_memberships set active=false where user_id='${users.operations.id}'`,
  );
  expect(
    (
      await operations.rpc("add_order_note", {
        order_id: orderId,
        note: "must not persist",
      })
    ).error?.code,
  ).toBe("42501");
});
