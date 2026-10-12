import { expect, test } from "@playwright/test";

test("brand story paragraphs form two undivided columns on wide screens", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");

  for (const locale of ["en", "zh-hant", "ja"]) {
    for (const width of [900, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/${locale}/story`, { waitUntil: "domcontentloaded" });
      const paragraphs = page.locator(".story-origin-copy > p");
      await expect(paragraphs).toHaveCount(2);

      const [left, right] = await Promise.all([
        paragraphs.nth(0).boundingBox(),
        paragraphs.nth(1).boundingBox(),
      ]);
      expect(left).not.toBeNull();
      expect(right).not.toBeNull();
      expect(Math.abs(left!.y - right!.y)).toBeLessThanOrEqual(2);
      expect(right!.x - (left!.x + left!.width)).toBeGreaterThanOrEqual(32);
      expect(right!.x + right!.width).toBeLessThanOrEqual(width);

      const style = await page.locator(".story-origin-copy").evaluate((el) => {
        const css = getComputedStyle(el);
        return { columns: css.gridTemplateColumns.split(" ").length, border: css.borderLeftWidth };
      });
      expect(style.columns).toBe(2);
      expect(style.border).toBe("0px");
    }
  }
});

test("brand story stacks on phones while the next section has no hairline", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.setViewportSize({ width: 375, height: 740 });
  await page.goto("/en/story", { waitUntil: "domcontentloaded" });

  const paragraphs = page.locator(".story-origin-copy > p");
  const first = await paragraphs.nth(0).boundingBox();
  const second = await paragraphs.nth(1).boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height);

  const borders = await page.evaluate(() => {
    const principles = getComputedStyle(document.querySelector(".story-principles")!);
    const titleRule = getComputedStyle(document.querySelector(".story-section-label")!, "::after");
    return {
      top: principles.borderTopWidth,
      bottom: principles.borderBottomWidth,
      titleRule: titleRule.height,
    };
  });
  expect(borders).toEqual({ top: "0px", bottom: "0px", titleRule: "1px" });
});
