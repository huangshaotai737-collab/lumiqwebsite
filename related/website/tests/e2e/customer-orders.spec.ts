import { test, expect, type Page } from "@playwright/test";
import {
  setup,
  cleanup,
  configure,
  users,
  password,
  sql,
  address,
} from "../support/order-fixtures";
const origin = "http://127.0.0.1:4211";
let previousOrderId = "";
let pendingKey = "";
let requestBody: Record<string, unknown>;
test.beforeAll(setup);
test.afterAll(cleanup);
test.describe.configure({ mode: "serial" });
async function login(page: Page, role = "a") {
  await page.context().clearCookies();
  await page.context().setExtraHTTPHeaders({
    "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::4`,
  });
  const r = await page.request.post("/api/auth/signin", {
    headers: { origin },
    data: {
      email: users[role].email,
      password,
      locale: "en",
      next: "/en/checkout",
    },
  });
  expect(r.status()).toBe(200);
}
async function cart(page: Page, items = [{ id: "ola", quantity: 2 }]) {
  await page.goto("/en/checkout");
  await page.evaluate(
    (items) =>
      localStorage.setItem(
        "lumiq-cart-v1",
        JSON.stringify({ version: 1, items }),
      ),
    items,
  );
  await page.reload();
}
test("login cannot submit credentials in a query before hydration, including Enter", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  let queryLeak = false;
  page.on("request", (request) => {
    if (new URL(request.url()).searchParams.has("password")) queryLeak = true;
  });
  await page.route("**/_next/static/**/*.js", async (route) => {
    await gate;
    await route.continue();
  });
  const url = origin + "/en/login?next=%2Fen%2Fcheckout";
  try {
    await page.goto(url, { waitUntil: "commit" });
    const form = page.getByRole("main").locator("form");
    const submit = page.getByRole("button", { name: "Sign in", exact: true });
    await expect(form).toHaveAttribute("method", /post/i);
    await expect(submit).toBeDisabled();
    await page.getByLabel("Email", { exact: true }).fill(users.a.email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Password", { exact: true }).press("Enter");
    await expect(page).toHaveURL(url);
    expect(queryLeak).toBe(false);
  } finally {
    release();
  }
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeEnabled();
  await page
    .context()
    .setExtraHTTPHeaders({
      "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::7`,
    });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
  expect(queryLeak).toBe(false);
});
test("checkout disabled still offers waitlist and safe sign-in", async ({
  page,
}) => {
  await cart(page);
  const trigger = page.locator(".cart-nav-trigger");
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await trigger.click();
    await expect(page.locator("#lumiq-cart")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#lumiq-cart")).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
  }
  await expect(
    page.getByRole("heading", { name: "Checkout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Payments are not open. Submitting will not charge you or confirm a purchase.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("main")
      .getByRole("link", { name: "Join the waitlist", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit pending order", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("link", { name: "Sign in to continue", exact: true })
    .click();
  expect(new URL(page.url()).searchParams.get("next")).toBe("/en/checkout");
  await page.getByLabel("Email", { exact: true }).fill(users.a.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.context().setExtraHTTPHeaders({
    "x-real-ip": `2001:db8:${crypto.randomUUID().slice(0, 4)}::5`,
  });
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/checkout$/);
});
test("retry_checkout_reuses_order after lost response, reload and double submit", async ({
  page,
}) => {
  await configure();
  await login(page);
  await cart(page);
  for (const [name, value] of Object.entries(address)) {
    if (value) await page.locator(`[name="${name}"]`).fill(value);
  }
  await page.getByRole("checkbox").check();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `test-results/checkout-${width}.png`,
      fullPage: true,
    });
  }
  const requests: string[] = [];
  let drop = true;
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    const body = route.request().postDataJSON();
    requests.push(body.idempotencyKey);
    requestBody = body;
    pendingKey = body.idempotencyKey;
    const response = await route.fetch();
    expect(response.status()).toBe(drop ? 201 : 200);
    if (drop) {
      drop = false;
      await route.abort("failed");
    } else await route.fulfill({ response });
  });
  await page
    .getByRole("button", { name: "Submit pending order", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(
    page.getByText("The result is not confirmed.", { exact: false }),
  ).toBeVisible();
  expect(
    sql(
      `select count(*) from public.customer_orders where user_id='${users.a.id}'`,
    ),
  ).toBe("1");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Retry the same request", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("[name=name]")).toBeDisabled();
  await page
    .getByRole("button", { name: "Retry the same request", exact: true })
    .click();
  await expect(page).toHaveURL(/\/members\/orders\/[0-9a-f-]+$/);
  previousOrderId = page.url().split("/").pop()!;
  expect(requests).toEqual([pendingKey, pendingKey]);
  expect(
    sql(
      `select count(*) from public.customer_orders where user_id='${users.a.id}'`,
    ),
  ).toBe("1");
  await expect(
    page.getByRole("heading", { name: previousOrderId, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Waiting for payment setup", { exact: true }),
  ).toBeVisible();
  const result = await (
    await page.request.get(`/api/orders/${previousOrderId}`)
  ).json();
  expect(result.data.totals).toEqual({
    itemsMinor: 246,
    shippingMinor: null,
    taxMinor: null,
    payableMinor: null,
  });
  expect(JSON.stringify(result)).not.toContain("notes");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/customer-order-${width}.png`,
      fullPage: true,
    });
  }
});
test("cancel refresh repeat retry and customer isolation", async ({ page }) => {
  await login(page);
  await page.goto(`/en/members/orders/${previousOrderId}`);
  await page.getByRole("button", { name: "Cancel order", exact: true }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  const repeated = await page.request.post(
    `/api/orders/${previousOrderId}/cancel`,
    { headers: { origin } },
  );
  expect(repeated.status()).toBe(200);
  expect((await repeated.json()).data.status).toBe("cancelled");
  const retry = await page.request.post("/api/orders", {
    headers: { origin },
    data: requestBody,
  });
  expect(retry.status()).toBe(200);
  expect((await retry.json()).data.order.status).toBe("cancelled");
  await page.reload();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  expect(
    (
      await page.request.post("/api/orders", {
        headers: { origin: "https://other.invalid" },
        data: requestBody,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/orders", {
        headers: { origin },
        data: {
          ...requestBody,
          idempotencyKey: "conflict-" + crypto.randomUUID(),
          unitMinor: 1,
        },
      })
    ).status(),
  ).toBe(400);
});
test("switch_account_hides_previous_orders including guessed detail and stale checkout identity", async ({
  page,
}) => {
  await login(page);
  await page.goto("/en/members/orders");
  await expect(page.getByText(previousOrderId, { exact: true })).toBeVisible();
  await login(page, "b");
  await page.reload();
  await expect(page.getByText("No orders yet.", { exact: true })).toBeVisible();
  await expect(page.getByText(previousOrderId)).toHaveCount(0);
  expect(
    (await page.request.get(`/api/orders/${previousOrderId}`)).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(`/api/orders/${previousOrderId}/cancel`, {
        headers: { origin },
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post("/api/orders", {
        headers: { origin, "x-lumiq-customer": users.a.id },
        data: requestBody,
      })
    ).status(),
  ).toBe(409);
  await page.goto(`/en/members/orders/${previousOrderId}`);
  await expect(
    page.getByText("Orders are unavailable.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: previousOrderId }),
  ).toHaveCount(0);
});
test("pending checkout address is hidden and discarded on account switch", async ({
  page,
}) => {
  await login(page);
  await cart(page);
  for (const [name, value] of Object.entries(address)) {
    if (value) await page.locator(`[name="${name}"]`).fill(value);
  }
  await page.getByRole("checkbox").check();
  await page.route("**/api/orders", async (route) => {
    if (route.request().method() === "POST") await route.abort("failed");
    else await route.continue();
  });
  await page
    .getByRole("button", { name: "Submit pending order", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Retry the same request", exact: true }),
  ).toBeEnabled();
  const oldKey = `lumiq-checkout-v1:${users.a.id}`;
  expect(
    await page.evaluate((key) => Boolean(sessionStorage.getItem(key)), oldKey),
  ).toBe(true);
  // Model a real account change in another tab, then focus the old checkout.
  await login(page, "b");
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator("[name=name]")).toHaveValue("");
  await expect(
    page.getByRole("button", { name: "Retry the same request", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), oldKey),
  ).toBeNull();
  await expect(
    page.getByText("Synthetic Recipient", { exact: true }),
  ).toHaveCount(0);
});
test("Go-only and unavailable cart items stay explicit and cannot submit", async ({
  page,
}) => {
  await login(page);
  await cart(page, [{ id: "ola-go", quantity: 1 }]);
  await expect(
    page.getByText("Ola Go is included with Ola;", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit pending order", exact: true }),
  ).toBeDisabled();
  await cart(page, [
    { id: "ola", quantity: 1 },
    { id: "print", quantity: 1 },
  ]);
  await expect(
    page.getByText("This item is not available for standalone ordering.", {
      exact: false,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit pending order", exact: true }),
  ).toBeDisabled();
  for (const locale of ["zh-hant", "ja"]) {
    await page.goto(`/${locale}/checkout`);
    await expect(
      page.getByRole("heading", {
        name: locale === "ja" ? "チェックアウト" : "結帳",
        exact: true,
      }),
    ).toBeVisible();
  }
});
