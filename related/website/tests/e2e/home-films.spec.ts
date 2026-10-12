import { test, expect } from '@playwright/test';

test('one film at a time; switching stops the old film and wraps', async ({ page }) => {
  await page.goto('/en?films=1#films');
  const section = page.locator('.lh-films');
  await section.scrollIntoViewIfNeeded();
  const film = section.locator('video');
  await expect(film).toHaveCount(1);
  await expect(film).not.toHaveAttribute("controls");
  await film.evaluate(async (video: HTMLVideoElement) => { video.muted = true; await video.play(); });
  await expect.poll(() => film.evaluate((video: HTMLVideoElement) => video.paused)).toBe(false);
  const old = await film.elementHandle();
  await section.getByRole('button', { name: 'Next film' }).click();
  await expect(section.locator('source')).toHaveAttribute('src', /worlds-together/);
  expect(await old!.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  await expect(film).toHaveCount(1);
  expect(await film.evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  await section.getByRole('button', { name: 'Next film' }).click();
  await expect(section.locator('source')).toHaveAttribute('src', /welcome-home/);
  await section.getByRole('button', { name: 'Next film' }).click();
  await expect(section.locator('source')).toHaveAttribute('src', /everyday-companion/);
});
