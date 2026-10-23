import { test, expect, type Page } from "@playwright/test";
import {
  setup,
  cleanup,
  configure,
  customer,
  users,
  password,
  sql,
  address,
} from "../support/order-fixtures";
const origin = "http://127.0.0.1:4211";
test.beforeAll(setup);
test.afterAll(cleanup);
test.beforeEach(async () => {
  await configure();
});
async function login(page: Page, role = "a") {
  await page.context().clearCookies();
  await page.context().setExtraHTTPHeaders({
    "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::8`,
  });
  expect(
    (
      await page.request.post("/api/auth/signin", {
        headers: { origin },
        data: {
          email: users[role].email,
          password,
          locale: "en",
          next: "/en/checkout",
        },
      })
    ).status(),
  ).toBe(200);
}
async function checkout(page: Page) {
  await login(page);
  await page.goto("/en/checkout");
  await page.evaluate(() =>
    localStorage.setItem(
      "lumiq-cart-v1",
      JSON.stringify({ version: 1, items: [{ id: "ola", quantity: 1 }] }),
    ),
  );
  await page.reload();
  for (const [key, value] of Object.entries(address))
    if (value) await page.locator(`[name=${key}]`).fill(value);
  await page.getByRole("checkbox").check();
}
test("older identity response cannot reveal prior address after a newer failed check; pageshow revalidates", async ({
  page,
}) => {
  await checkout(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  let oldStarted!: () => void;
  const oldReady = new Promise<void>((r) => (oldStarted = r));
  let oldFinished!: () => void;
  const oldDone = new Promise<void>((r) => (oldFinished = r));
  let newerFinished!: () => void;
  const newDone = new Promise<void>((r) => (newerFinished = r));
  let calls = 0;
  await page.route("**/api/account/profile", async (route) => {
    calls++;
    if (calls === 1) {
      const response = await route.fetch();
      oldStarted();
      await gate;
      await route.fulfill({ response });
      oldFinished();
    } else if (calls === 2) {
      await route.fulfill({
        status: 503,
        json: {
          ok: false,
          error: "UNAVAILABLE",
          requestId: "synthetic-network-failure",
        },
      });
      newerFinished();
    } else await route.continue();
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await oldReady;
    await login(page, "b");
    await page.evaluate(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "lumiq-account-revision",
          newValue: "synthetic-change",
        }),
      ),
    );
    await newDone;
    await expect(page.locator("p[role=alert]")).toContainText(
      "Orders are unavailable.",
    );
    const delivered = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/account/profile") &&
        response.status() === 200,
    );
    release();
    await oldDone;
    await (await delivered).finished();
    // Observe completed delivery and two render frames; the older callback must remain ineffective.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await expect(page.locator("[name=name]")).toHaveCount(0);
    await page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    );
    await expect(page.locator("[name=name]")).toHaveValue("");
    expect(calls).toBeGreaterThanOrEqual(3);
  } finally {
    release();
  }
});
async function publishChangedTerms() {
  const draft = crypto.randomUUID(),
    release = crypto.randomUUID();
  // Fixture a real immutable changed publication; CMS publishing/asset attestation is outside this test.
  sql(
    `begin;insert into public.content_drafts(id,version,snapshot,created_by,updated_by) select '${draft}',1,jsonb_set(r.snapshot,'{messages,en,Legal,terms,p1}',to_jsonb((r.snapshot#>>'{messages,en,Legal,terms,p1}')||' C4 revised terms ${release}')),'${users.admin.id}','${users.admin.id}' from public.content_publication p join public.content_releases r on r.id=p.release_id;insert into public.content_releases(id,snapshot,draft_id,draft_version,created_by) select '${release}',snapshot,id,version,'${users.admin.id}' from public.content_drafts where id='${draft}';update public.content_publication set release_id='${release}',updated_at=now() where singleton;commit;`,
  );
  const catalog = await configure();
  expect(catalog.terms.releaseId).toBe(release);
  return catalog;
}
test("reapproved changed terms reject uncommitted stale request then refresh and require new acceptance", async ({
  page,
}) => {
  await checkout(page);
  const current = await publishChangedTerms();
  const requests: { idempotencyKey: string; termsVersion: string }[] = [];
  const results: { status: number; body: { ok: boolean; error?: string } }[] =
    [];
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    requests.push(route.request().postDataJSON());
    const response = await route.fetch();
    results.push({ status: response.status(), body: await response.json() });
    await route.fulfill({ response });
  });
  const before = sql(
    `select count(*) from public.customer_orders where user_id='${users.a.id}'`,
  );
  await page
    .getByRole("button", { name: "Submit pending order", exact: true })
    .click();
  await expect.poll(() => results.length).toBe(1);
  expect(results[0]).toMatchObject({
    status: 409,
    body: { ok: false, error: "TERMS_CHANGED" },
  });
  expect(
    sql(
      `select count(*) from public.customer_orders where user_id='${users.a.id}'`,
    ),
  ).toBe(before);
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  expect(
    await page.evaluate(
      (key) => sessionStorage.getItem(key),
      `lumiq-checkout-v1:${users.a.id}`,
    ),
  ).toBeNull();
  await page.locator(".orders-terms summary").click();
  // The automatic server refresh must expose the new approval before a manual reload too.
  await expect(page.locator(".orders-terms")).toContainText(
    current.terms.releaseId,
  );
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.reload();
  await page.locator(".orders-terms summary").click();
  await expect(page.locator(".orders-terms")).toContainText(
    current.terms.releaseId,
  );
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Submit pending order", exact: true }),
  ).toBeDisabled();
  for (const [key, value] of Object.entries(address))
    if (value) await page.locator(`[name=${key}]`).fill(value);
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Submit pending order", exact: true })
    .click();
  await expect(page).toHaveURL(/\/members\/orders\/[0-9a-f-]+$/);
  expect(results[1].status).toBe(201);
  expect(requests[1].termsVersion).toBe(current.terms.releaseId);
  expect(requests[1].idempotencyKey).not.toBe(requests[0].idempotencyKey);
  expect(
    sql(
      `select terms_release_id from public.customer_orders where id='${page.url().split("/").pop()}'`,
    ),
  ).toBe(current.terms.releaseId);
});
test("approved legal text keeps canonical order, eyebrow and draft in all three expanded locales", async ({
  page,
}) => {
  await login(page);
  const client = await customer();
  const result = await client.rpc("get_ordering_catalog");
  if (result.error) throw Error("catalog fixture failed");
  for (const locale of ["en", "zh-hant", "ja"] as const) {
    await page.goto(`/${locale}/checkout`);
    await page.locator(".orders-terms summary").click();
    const terms = result.data.terms.locales[locale],
      legal = terms.terms;
    const text = await page
      .locator(".orders-terms > :is(p,h2,h3,aside)")
      .allTextContents();
    expect(text[0]).toContain(result.data.terms.releaseId);
    expect(text.slice(1)).toEqual([
      terms.eyebrow,
      legal.title,
      legal.intro,
      terms.draft,
      legal.p1,
      legal.h1,
      legal.p2,
      legal.h2,
      legal.p3,
      legal.h3,
      legal.p4,
      legal.h4,
      legal.p5,
      terms.shipping,
      terms.returns,
      terms.warranty,
    ]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/approved-terms-${locale}.png`,
      fullPage: true,
    });
  }
});
