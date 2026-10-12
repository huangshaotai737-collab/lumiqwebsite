import { expect, test } from "@playwright/test";

test("desktop products pin, move sideways, release and reverse", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".lh-products")).toHaveAttribute(
    "data-pinned",
    "true",
  );
  const measure = () =>
    page.evaluate(() => {
      const stage = document.querySelector<HTMLElement>(".lh-products-stage")!;
      const viewport = document.querySelector<HTMLElement>(
        ".lh-products-viewport",
      )!;
      const track = document.querySelector<HTMLElement>(".lh-products-track")!;
      const spacer = stage.parentElement!;
      return {
        start: spacer.getBoundingClientRect().top + scrollY,
        distance: track.scrollWidth - viewport.clientWidth,
        pinnedDistance: spacer.getBoundingClientRect().height - stage.offsetHeight,
        stride: document.querySelector<HTMLElement>(".lh-product-slot")!.offsetWidth + 24,
        width:
          document.querySelector<HTMLElement>(".lh-product-slot")!.offsetWidth,
        count:
          viewport.clientWidth /
          (document.querySelector<HTMLElement>(".lh-product-slot")!
            .offsetWidth +
            24),
      };
    });
  const { start, distance, pinnedDistance, stride, width, count } = await measure();
  expect(width).toBe(480);
  expect(count).toBeGreaterThan(2.3);
  expect(count).toBeLessThan(3);
  const scroll = async (top: number) => {
    await page.evaluate(
      (value) => scrollTo({ top: value, behavior: "instant" }),
      top,
    );
    await page.waitForTimeout(850); // allow the intentional scrub catch-up to settle
  };
  await scroll(start + stride);
  expect(
    (await page.locator(".lh-products-stage").boundingBox())!.y,
  ).toBeCloseTo(0, 0);
  const transformX = () =>
    page
      .locator(".lh-products-track")
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
  expect(await transformX()).toBeCloseTo(-stride, -1);
  await scroll(start + distance);
  const last = (await page.locator(".lh-product").last().boundingBox())!;
  const viewport = (await page.locator(".lh-products-viewport").boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(
    viewport.x + viewport.width + 2,
  );
  await scroll(start + distance + 250);
  expect((await page.locator(".lh-products-stage").boundingBox())!.y).toBeCloseTo(0, 0);
  await scroll(start + pinnedDistance + 250);
  expect(
    (await page.locator(".lh-products-stage").boundingBox())!.y,
  ).toBeLessThan(-240);
  await scroll(start);
  expect(await transformX()).toBeCloseTo(0, 0);
  await page.locator(".lh-product").last().focus();
  await page.waitForTimeout(850);
  const focused = (await page.locator(".lh-product").last().boundingBox())!;
  expect(focused.x).toBeGreaterThanOrEqual(viewport.x - 2);
  expect(focused.x + focused.width).toBeLessThanOrEqual(
    viewport.x + viewport.width + 2,
  );
  await expect(page.locator(".lh-podium, .lh-product-orbit")).toHaveCount(0);
});

test("products stay accessible across sizes and languages", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  for (const [width, height] of [
    [1920, 1080],
    [2560, 1080],
    [1280, 720],
    [1024, 768],
    [390, 844],
    [320, 740],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(400);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await expect(page.locator(".lh-product")).toHaveCount(5);
    if (width > 1100) {
      await expect(page.locator(".lh-products")).toHaveAttribute(
        "data-pinned",
        "true",
      );
    } else {
      await expect(page.locator(".lh-products")).not.toHaveAttribute(
        "data-pinned",
      );
      // A retained identity matrix is harmless; there must be no stale offset.
      expect(
        await page
          .locator(".lh-products-track")
          .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41),
      ).toBe(0);
    }
  }
  for (const locale of ["zh-hant", "ja"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".lh-product")).toHaveCount(5);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(1);
  }
});

test("reduced motion uses native scrolling with working controls", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".lh-products")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await expect(page.locator(".lh-products")).not.toHaveAttribute("data-pinned");
  await page.locator("[data-products-next]").click();
  expect(
    await page.locator(".lh-products-viewport").evaluate((el) => el.scrollLeft),
  ).toBeGreaterThan(400);
  await page.locator("[data-products-previous]").click();
  await expect
    .poll(() =>
      page.locator(".lh-products-viewport").evaluate((el) => el.scrollLeft),
    )
    .toBe(0);
});

test("without JavaScript all five product links remain usable", async ({
  browser,
}, info) => {
  test.skip(info.project.name !== "desktop");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:4191/en", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".lh-product")).toHaveCount(5);
  expect(
    await page
      .locator(".lh-products-viewport")
      .evaluate((el) => getComputedStyle(el).overflowX),
  ).toBe("auto");
  await expect(page.locator(".lh-products-controls")).toBeHidden();
  await context.close();
});

test("phone shows a swipeable rail without pinning", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile");
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".lh-products")).toHaveAttribute(
    "data-enhanced",
    "true",
  );
  await expect(page.locator(".lh-products")).not.toHaveAttribute("data-pinned");
  await page.locator(".lh-products-viewport").evaluate((el) => {
    el.scrollLeft = el.scrollWidth;
  });
  await expect
    .poll(() =>
      page.locator(".lh-products-viewport").evaluate((el) => el.scrollLeft),
    )
    .toBeGreaterThan(800);
  const final = (await page.locator(".lh-product").last().boundingBox())!;
  expect(final.x + final.width).toBeLessThanOrEqual(391);
});
