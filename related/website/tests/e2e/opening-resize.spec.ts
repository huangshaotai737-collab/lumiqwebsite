import { expect, test, type Page } from "@playwright/test";

test.use({ channel: "chrome" });
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop film and its responsive handoff");
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto("/zh-hant");
  await expect(page.locator(".lh-video-layer")).toHaveAttribute("data-ready", "true");
  await page.evaluate(() => document.fonts.ready);
});

const state = (page: Page) => page.locator(".lh-opening-video").evaluate((video: HTMLVideoElement) => ({
  time: video.currentTime,
  progress: Number(video.dataset.scrollProgress),
  y: scrollY,
  src: video.getAttribute("src"),
}));

// Catches height-dependent scroll-distance recalculation advancing the film,
// and unrelated responsive GSAP contexts resetting the opening to frame zero.
test("height resizing preserves the current opening frame and reverse scrub", async ({ page }) => {
  await page.evaluate(() => scrollTo({ top: 1100, behavior: "instant" }));
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(3);
  const before = await state(page);
  for (const height of [600, 1000, 498, 800]) {
    await page.setViewportSize({ width: 1440, height });
    await page.waitForTimeout(650);
    const after = await state(page);
    expect(Math.abs(after.progress - before.progress), `frame progress at ${height}px height`).toBeLessThan(.015);
    expect(Math.abs(after.time - before.time)).toBeLessThan(.09);
  }
  await page.mouse.wheel(0, -240);
  await expect.poll(async () => (await state(page)).time).toBeLessThan(before.time - .2);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(async () => (await state(page)).time).toBeLessThan(.05);
});

// Catches pin teardown discarding the saved desktop chapter during mobile mode.
test("1100/1101px handoff retains opening progress when returning to desktop", async ({ page }) => {
  await page.evaluate(() => scrollTo({ top: 1100, behavior: "instant" }));
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(3);
  const before = await state(page);
  await page.setViewportSize({ width: 1100, height: 800 });
  await expect(page.locator(".lh-opening")).not.toHaveAttribute("data-video-mode", "true");
  expect((await state(page)).src).toBeNull();
  await page.waitForTimeout(650);
  await page.setViewportSize({ width: 1101, height: 800 });
  await expect(page.locator(".lh-video-layer")).toHaveAttribute("data-ready", "true");
  await page.waitForTimeout(650);
  expect(Math.abs((await state(page)).progress - before.progress)).toBeLessThan(.015);
  expect(Math.abs((await state(page)).time - before.time)).toBeLessThan(.09);
});

// Catches independent poster/video sizing, distorted products, clipped hardware,
// and discontinuities at the formerly special 19/10 aspect ratio.
test("continuous width and aspect-ratio resize keeps one proportional media plane", async ({ page }) => {
  let previous: { width: number; center: number } | undefined;
  for (const width of [1516, 1518, 1519, 1520, 1521, 1522, 1524]) {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const boxes = await page.evaluate(() => [".lh-opening-video", ".lh-video-start-poster", ".lh-video-end-poster"].map(selector => {
      const r = document.querySelector(selector)!.getBoundingClientRect();
      return { width: r.width, height: r.height, center: r.y + r.height / 2, left: r.left, right: r.right };
    }));
    for (const box of boxes) {
      expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(.001);
      expect(Math.abs((box.left + box.right) / 2 - width / 2)).toBeLessThan(1);
      expect(box.left).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(width + 1);
      expect(box.center - box.height / 2).toBeGreaterThan(90);
      expect(box.center + box.height / 2).toBeLessThan(792);
      expect(Math.abs(box.width - boxes[0].width)).toBeLessThan(.1);
    }
    if (previous) expect(Math.abs(boxes[0].center - previous.center)).toBeLessThan(1);
    previous = boxes[0];
  }
  for (const [width, height] of [[1280, 720], [1440, 1000], [2435, 498], [3440, 1440]]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(350);
    const box = await page.locator(".lh-opening-video").boundingBox();
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 3);
    expect((await state(page)).time).toBeLessThan(.05);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});

// Catches progress snapshots being overwritten by the intermediate pin revert
// during a drag, including quick consecutive desktop/mobile transitions.
test("a continuous window drag keeps the mid-film frame through width and height breakpoints", async ({ page }) => {
  await page.evaluate(() => scrollTo({ top: 1100, behavior: "instant" }));
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(3);
  const before = await state(page);
  for (const [width, height] of [[1460, 790], [1500, 780], [1519, 799], [1521, 801], [1440, 719], [1400, 640], [1380, 600], [1280, 498], [1101, 720], [1100, 720], [1090, 730], [1101, 740], [1440, 800]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    if (width > 1100) expect(Math.abs((await state(page)).progress - before.progress)).toBeLessThan(.015);
  }
  await page.waitForTimeout(650);
  expect(Math.abs((await state(page)).time - before.time)).toBeLessThan(.09);
  await page.mouse.wheel(0, 240);
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(before.time + .2);
});

test("a direct OLA link still opens the final opening frame", async ({ page }) => {
  await page.goto("/en#ola");
  await expect(page.locator(".lh-video-layer")).toHaveAttribute("data-ready", "true");
  await expect.poll(() => page.locator(".lh-opening-video").evaluate((video: HTMLVideoElement) => video.duration - video.currentTime)).toBeLessThan(.15);
});

// HomeMotion refreshes after fonts finish loading. Trigger that existing
// boundary during the resize settling window to catch a later snapshot replay.
for (const activation of ["pointer", "Enter"] as const) {
  test(`${activation} navigation immediately after resize is never pulled back into the opening`, async ({ page }) => {
    const discover = page.locator('.lh-hero a[href="#products"]');
    await page.setViewportSize({ width: 1450, height: 810 });
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const tracking = page.evaluate(() => new Promise<{ y: number; progress: number; hash: string; productTop: number }[]>(resolve => {
      window.addEventListener("click", () => {
        setTimeout(() => document.fonts.dispatchEvent(new Event("loadingdone")), 180);
        const positions: { y: number; progress: number; hash: string; productTop: number }[] = [];
        const until = performance.now() + 700;
        const sample = () => {
          positions.push({
            y: scrollY,
            progress: Number((document.querySelector(".lh-opening-video") as HTMLVideoElement).dataset.scrollProgress),
            hash: location.hash,
            productTop: document.querySelector("#products")!.getBoundingClientRect().top,
          });
          if (performance.now() < until) requestAnimationFrame(sample);
          else resolve(positions);
        };
        sample();
      }, { once: true });
    }));
    if (activation === "Enter") await discover.focus();
    if (activation === "Enter") await page.keyboard.press("Enter");
    else await discover.click();
    const positions = await tracking;
    expect(positions.at(-1)!.y, JSON.stringify(positions)).toBeGreaterThan(2000);
    const largestRetreat = Math.min(0, ...positions.slice(1).map((s, index) => s.y - positions[index].y));
    expect(largestRetreat, "a delayed resize refresh must not undo the user's navigation: " + JSON.stringify(positions)).toBeGreaterThan(-100);
  });
}

test("pointer initiated scrollbar movement cancels resize restoration", async ({ page }) => {
  await page.evaluate(() => scrollTo({ top: 1100, behavior: "instant" }));
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(3);
  await page.setViewportSize({ width: 1440, height: 760 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.evaluate(() => setTimeout(() => document.fonts.dispatchEvent(new Event("loadingdone")), 180));
  // Native scrollbar positioning varies between headless platforms. Exercise
  // its pointerdown followed by a real browser scroll, without wheel/key input.
  await page.mouse.move(1439, 200);
  await page.mouse.down();
  await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
  await page.mouse.up();
  await page.waitForTimeout(650);
  expect((await state(page)).y).toBeLessThan(650);
});

test("generic refreshes do not reacquire resize restoration during a held pointer scroll", async ({ page }) => {
  await page.evaluate(() => scrollTo({ top: 1100, behavior: "instant" }));
  await expect.poll(async () => (await state(page)).time).toBeGreaterThan(3);
  await page.setViewportSize({ width: 1440, height: 760 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.mouse.move(1439, 200);
  await page.mouse.down();
  await page.evaluate(async () => {
    const nextFrame = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    scrollTo({ top: 600, behavior: "instant" });
    await nextFrame();
    document.fonts.dispatchEvent(new Event("loadingdone"));
    // The same pointer gesture continues after the first generic refresh.
    scrollTo({ top: 900, behavior: "instant" });
    await nextFrame();
    document.fonts.dispatchEvent(new Event("loadingdone"));
    await nextFrame();
  });
  await page.mouse.up();
  await page.waitForTimeout(650);
  expect((await state(page)).y).toBeGreaterThan(850);
});
