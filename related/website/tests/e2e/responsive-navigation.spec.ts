import { expect, test } from "@playwright/test";

test("full navigation fits at 1024px in every language", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");

  for (const locale of ["en", "zh-hant", "ja"]) {
    await page.setViewportSize({ width: 1024, height: 740 });
    await page.goto(`/${locale}/story`, { waitUntil: "domcontentloaded" });
    const desktop = page.locator(".site-desktop-nav");
    await expect(desktop).toBeVisible();
    await expect(desktop.locator("a")).toHaveCount(6);
    await expect(page.locator(".site-mobile-trigger")).toBeHidden();
    const lastLink = await desktop.locator("a").last().boundingBox();
    const actions = await page.locator(".nav-actions").boundingBox();
    expect(lastLink!.x + lastLink!.width).toBeLessThan(actions!.x);
  }
});

test("mobile menu closes and unlocks scrolling when desktop navigation appears", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.setViewportSize({ width: 768, height: 740 });
  await page.goto("/en/story");
  await page.locator(".site-mobile-trigger").click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  await page.setViewportSize({ width: 1024, height: 740 });
  await expect(page.locator(".site-desktop-nav")).toBeVisible();
  await expect(page.locator("#mobile-navigation")).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe("hidden");
});

test("a 320px phone shows a labeled menu with all destinations and languages", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  for (const locale of ["en", "zh-hant", "ja"]) {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto(`/${locale}/story`);
    const trigger = page.locator(".site-mobile-trigger");
    await expect(trigger).toBeVisible();
    expect((await trigger.innerText()).trim()).not.toBe("");

    const capsule = await page.locator(".site-nav").boundingBox();
    const triggerBox = await trigger.boundingBox();
    const waitlist = await page.locator(".site-login-btn").boundingBox();
    expect(waitlist!.x + waitlist!.width).toBeLessThan(triggerBox!.x);
    expect(triggerBox!.x + triggerBox!.width).toBeLessThanOrEqual(capsule!.x + capsule!.width);
    await trigger.click();
    await expect(page.locator("#mobile-navigation a[role='menuitem']")).toHaveCount(6);
    await expect(page.locator("#mobile-navigation .site-mobile-languages button")).toHaveCount(3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(321);
  }
});

test("public pages keep headings and navigation inside narrow and wide viewports", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  test.setTimeout(180_000);
  const routes = [
    "", "/products", "/products/ola", "/products/ola-go",
    "/products/tablet", "/products/print", "/products/nest",
    "/story", "/plans", "/media", "/faq",
  ];
  for (const locale of ["en", "zh-hant", "ja"]) {
    for (const route of routes) {
      await page.goto(`/${locale}${route}`, { waitUntil: "domcontentloaded" });
      for (const width of [320, 768, 1024, 1440, 2560]) {
        await page.setViewportSize({ width, height: 740 });
        const rects = await page.evaluate(() => {
          const nav = document.querySelector(".site-nav")!.getBoundingClientRect();
          const heading = document.querySelector("main h1")!.getBoundingClientRect();
          return {
            scrollWidth: document.documentElement.scrollWidth,
            navLeft: nav.left,
            navRight: nav.right,
            navBottom: nav.bottom,
            headingLeft: heading.left,
            headingRight: heading.right,
            headingTop: heading.top,
          };
        });
        const label = `${locale}${route || "/"} at ${width}px`;
        expect(rects.scrollWidth, label).toBeLessThanOrEqual(width + 1);
        expect(rects.navLeft, label).toBeGreaterThanOrEqual(-1);
        expect(rects.navRight, label).toBeLessThanOrEqual(width + 1);
        expect(rects.headingLeft, label).toBeGreaterThanOrEqual(-1);
        expect(rects.headingRight, label).toBeLessThanOrEqual(width + 1);
        expect(rects.headingTop, label).toBeGreaterThan(rects.navBottom);
      }
    }
  }
});
