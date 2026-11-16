import { expect, test } from "@playwright/test";

test("opening frame follows the reader's scroll and stays put when idle", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "desktop scroll film only");
  await page.goto("/en");
  await expect(page.locator('.lh-home')).toHaveAttribute('data-home-state', 'open', { timeout: 60000 });
  await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true', {timeout: 60000});
  const video = page.locator('.lh-opening-video');
  const state = () => video.evaluate((v: HTMLVideoElement) => ({ time: v.currentTime, paused: v.paused }));
  expect((await state()).time).toBeLessThan(0.05);
  await page.evaluate(() => scrollTo({top: 1000, behavior: 'instant'}));
  await expect.poll(async () => (await state()).time, {timeout: 15000}).toBeGreaterThan(0.5);
  const held = await state();
  expect(held.paused).toBe(true);
  await page.waitForTimeout(500);
  expect(Math.abs((await state()).time - held.time)).toBeLessThan(0.1);
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect.poll(async () => (await state()).time, {timeout: 15000}).toBeLessThan(0.05);
});
