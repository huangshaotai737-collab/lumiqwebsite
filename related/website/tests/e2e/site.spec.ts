import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/en",
  "/en/about",
  "/en/contact",
  "/en/faq",
  "/en/media",
  "/en/plans",
  "/en/prelaunch",
  "/en/products",
  "/en/products/ola",
  "/en/products/ola-go",
  "/en/products/tablet",
  "/en/products/print",
  "/en/products/nest",
  "/en/story",
  "/en/legal/privacy",
  "/en/legal/terms",
  "/en/legal/cookies",
  "/en/legal/child-safety",
];

test.describe("public pages", () => {
  test("all published pages open without browser errors or failed images", async ({
    page,
    request,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "route sweep runs once on desktop",
    );
    for (const route of publicRoutes) {
      const response = await request.get(route);
      expect(response.status(), route).toBe(200);
    }

    const browserErrors: string[] = [];
    const failedImages: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("response", (response) => {
      if (response.request().resourceType() === "image" && !response.ok()) {
        failedImages.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto("/en");
    await page.waitForLoadState("networkidle");
    expect(browserErrors).toEqual([]);
    expect(failedImages).toEqual([]);
    expect(await page.locator('a[href="#"]').count()).toBe(0);
  });

  test("legacy product routes permanently redirect", async ({
    request,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "redirect status runs once on desktop",
    );
    const pal = await request.get("/en/products/pal", { maxRedirects: 0 });
    const book = await request.get("/en/products/book", { maxRedirects: 0 });
    expect(pal.status()).toBe(308);
    expect(pal.headers().location).toBe("/en/products/ola");
    expect(book.status()).toBe(308);
    expect(book.headers().location).toBe("/en/products/print");
  });

  test("unknown route returns 404", async ({ request }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "status check runs once on desktop",
    );
    expect((await request.get("/en/not-a-real-page")).status()).toBe(404);
  });

  test("homepage exposes every product detail route", async ({ page }) => {
    await page.goto("/en");
    for (const href of ["ola", "ola-go", "tablet", "print", "nest"]) {
      await expect(
        page.locator(`a[href="/en/products/${href}"]`).first(),
      ).toBeAttached();
    }
  });

  test("product carousel supports buttons and keyboard activation", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "desktop interaction is covered once",
    );
    await page.goto("/en/products");
    const next = page.getByRole("button", { name: "Next product" });
    await next.focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("tab", { name: /Lumiq Print/ }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("waitlist actions point to the prelaunch page", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "mobile",
      "link audit runs once on desktop",
    );
    for (const route of [
      "/en/products/ola",
      "/en/products/ola-go",
      "/en/products/tablet",
      "/en/products/print",
      "/en/products/nest",
      "/en/plans",
    ]) {
      await page.goto(route);
      const actions = page.getByRole("link", {
        name: /Join|Register interest/i,
      });
      const count = await actions.count();
      expect(count, route).toBeGreaterThan(0);
      for (let index = 0; index < count; index += 1) {
        expect(await actions.nth(index).getAttribute("href"), route).toMatch(
          /\/en\/prelaunch$/,
        );
      }
    }
  });
});

test.describe("waitlist", () => {
  test.beforeEach(async ({ page }) => page.goto("/en/prelaunch"));

  test("shows created, duplicate, invalid and service error states", async ({
    page,
  }) => {
    const email = page.getByLabel("Email address");
    const submit = page.getByRole("button", { name: "Notify me" });

    await page.route("**/api/waitlist", async (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, state: "created" }),
      }),
    );
    await email.fill("new@example.com");
    await submit.click();
    await expect(page.getByRole("status")).toContainText(
      "now on the Lumiq waitlist",
    );

    await email.fill("known@example.com");
    await page.unroute("**/api/waitlist");
    await page.route("**/api/waitlist", async (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, state: "already_registered" }),
      }),
    );
    await submit.click();
    await expect(page.getByRole("status")).toContainText("already");

    await email.fill("invalid");
    await submit.click();
    await expect(email).toHaveJSProperty("validity.valid", false);

    await email.fill("retry@example.com");
    await page.unroute("**/api/waitlist");
    await page.route("**/api/waitlist", async (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ ok: false, error: "temporarily_unavailable" }),
      }),
    );
    await submit.click();
    await expect(page.locator('p[role="alert"]')).toContainText("try again");
    await expect(email).toHaveValue("retry@example.com");
  });
});

test("mobile navigation opens, closes and navigates without horizontal overflow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile-only flow");
  await page.goto("/en");
  const trigger = page.getByRole("button", { name: "Open navigation menu" });
  await trigger.click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page
    .locator("#mobile-navigation")
    .getByRole("button", { name: "Close navigation menu" })
    .click();
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  await trigger.click();
  await page
    .locator("#mobile-navigation")
    .getByRole("menuitem", { name: "Products" })
    .click();
  await expect(page).toHaveURL(/\/en\/products$/);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
