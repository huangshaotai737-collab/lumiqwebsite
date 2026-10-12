import { expect, test, type Page } from "@playwright/test";

test.use({ channel: "chrome" });
test.setTimeout(120_000);

async function ready(page: Page, locale = "zh-hant") {
  await page.goto(`/${locale}`);
  await expect(page.locator(".lh-video-layer")).toHaveAttribute("data-ready", "true");
  await page.evaluate(() => document.fonts.ready);
}

async function geometry(page: Page) {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    const title = document.querySelector("#hero-title")!;
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const tops: number[] = [];
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(walker.currentNode);
      tops.push(...[...range.getClientRects()].filter(r => r.width > 1 && r.height > 1).map(r => Math.round(r.top)));
    }
    const lines = tops.filter((top, index) => !tops.slice(0, index).some(previous => Math.abs(previous - top) < 4)).length;
    return {
      textLines: [...title.querySelectorAll(".lh-hero-line")].map(line => {
        const text = document.createRange();
        text.selectNodeContents(line);
        const r = text.getBoundingClientRect();
        return { left: r.left, right: r.right };
      }),
      copy: box(".lh-hero-copy"), title: box("#hero-title"), font: parseFloat(getComputedStyle(title).fontSize), lines,
      primary: box('.lh-hero a[href="#products"]'), secondary: box(".lh-hero .lh-text-link"),
      nav: box(".site-nav"), video: box(".lh-opening-video"),
      overflow: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
}

// Catches viewport-height breakpoint swaps of font size, content-frame width,
// inherited relative top offsets, and narrowing the copy to a fraction of a grid cell.
test("continuous height dragging keeps one hero anchor, three title lines and one CTA row", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.setViewportSize({ width: 1710, height: 902 });
  await ready(page);
  const first = await geometry(page);
  let previous = first;
  let previousHeight = 902;
  for (const height of [900, 860, 856, 855, 854, 801, 800, 799, 721, 720, 719, 701, 641, 640, 639, 601, 600, 599, 545, 540, 498, 540, 599, 600, 601, 700, 900]) {
    await page.setViewportSize({ width: 1710, height });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const current = await geometry(page);
    expect(Math.abs(current.copy.x - first.copy.x), `horizontal anchor at height ${height}`).toBeLessThan(2);
    expect(current.lines, `title lines at height ${height}`).toBe(3);
    for (const line of current.textLines) expect(line.right).toBeLessThanOrEqual(current.copy.right + 1);
    expect(Math.abs(current.primary.y - current.secondary.y), `CTA row at height ${height}`).toBeLessThan(5);
    expect(current.copy.y).toBeGreaterThan(current.nav.bottom + 12);
    expect(current.copy.bottom).toBeLessThan(height - 12);
    // Adjacent one-pixel height changes cannot switch typography regimes.
    expect(Math.abs(current.font - previous.font), `font continuity at height ${height}`).toBeLessThan(Math.max(1, Math.abs(height - previousHeight) * .14));
    expect(current.overflow).toBe(false);
    previous = current;
    previousHeight = height;
  }
});

// Catches cover sizing cropping approved hardware and per-language text widths
// creating orphaned final glyphs or button collisions after width/height changes.
for (const locale of ["en", "zh-hant", "ja"]) {
  test(`${locale} hero contains the complete film and fits its deliberate three-line copy`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.setViewportSize({ width: 1710, height: 900 });
    await ready(page, locale);
    for (const [width, height] of [[1710, 900], [1710, 700], [1710, 600], [1710, 540], [1101, 800], [1280, 720], [1440, 1000], [2560, 1080], [3420, 545]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const current = await geometry(page);
      expect(current.video.width / current.video.height).toBeCloseTo(16 / 9, 3);
      expect(current.video.x).toBeGreaterThanOrEqual(-1);
      expect(current.video.right).toBeLessThanOrEqual(width + 1);
      expect(current.video.y).toBeGreaterThanOrEqual(current.nav.bottom + 8);
      expect(current.video.bottom).toBeLessThanOrEqual(height - 8);
      expect(current.lines).toBe(3);
      for (const line of current.textLines) expect(line.right).toBeLessThanOrEqual(current.copy.right + 1);
      expect(current.title.right).toBeLessThan(width - 12);
      expect(current.copy.bottom).toBeLessThan(height - 12);
      expect(Math.abs(current.primary.y - current.secondary.y)).toBeLessThan(5);
      expect(current.overflow).toBe(false);
    }
  });
}
