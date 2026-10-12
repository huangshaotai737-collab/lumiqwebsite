import { expect, test } from "@playwright/test";

test("opening holds, plays continuously at double speed, and stops on screen two", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop scroll film only");
  await page.goto("/en");
  await expect(page.locator('.lh-home')).toHaveAttribute('data-home-state', 'open', { timeout: 60000 });
  const video = page.locator('.lh-opening-video');
  const state = () => video.evaluate((v: HTMLVideoElement) => ({ time: v.currentTime, duration: v.duration, paused: v.paused }));
  expect((await state()).paused).toBe(true);
  expect((await state()).time).toBeLessThan(0.05);
  await page.mouse.move(600, 450);
  await page.mouse.wheel(0, 100);
  await expect.poll(async () => (await state()).time).toBeGreaterThan(0.5);
  const before = await state();
  expect(before.paused).toBe(false);
  const started = Date.now();
  await page.waitForTimeout(700);
  const after = await state();
  expect(Math.abs((after.time - before.time) - (Date.now() - started) / 500)).toBeLessThan(0.2);
  await expect.poll(async () => {
    const s = await state();
    return s.paused && Math.abs(s.time - s.duration) < 0.06;
  }, { timeout: 12000 }).toBe(true);
  const end = (await state()).time;
  await page.waitForTimeout(700);
  expect((await state()).time).toBeCloseTo(end, 2);
});
