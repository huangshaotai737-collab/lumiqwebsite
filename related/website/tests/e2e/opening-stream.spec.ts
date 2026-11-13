import {expect, test} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

test.beforeEach(({page}) => {
  test.skip((page.viewportSize()?.width ?? 0) < 1200, 'The scroll film is desktop only; mobile is covered by opening-media-sync');
});

// Serve real MP4 bytes but withhold the tail. Unlike route.fulfill or a mocked
// fetch, this exercises the browser's native streaming decoder and Range reads.
async function partialFilm() {
  const bytes = await readFile(process.env.OPENING_FILM_FILE ?? 'public/assets/home-video/compat-20261008/ola-scroll-v16-scrub.mp4');
  let released = false;
  let requests = 0;
  let ranges = 0;
  const tails = new Set<() => void>();
  const server = createServer((request, response) => {
    requests++;
    const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) ranges++;
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), bytes.length - 1) : bytes.length - 1;
    response.writeHead(range ? 206 : 200, {
      'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1, 'Access-Control-Allow-Origin': '*',
      ...(range ? {'Content-Range': `bytes ${start}-${end}/${bytes.length}`} : {}),
    });
    // Enough for the real first frame, but less than one fifth of the movie.
    const cutoff = released ? end + 1 : Math.min(end + 1, 1024 * 1024);
    if (start < cutoff) response.write(bytes.subarray(start, cutoff));
    if (cutoff > end) { response.end(); return; }
    const finish = () => { tails.delete(finish); response.end(bytes.subarray(Math.max(start, cutoff), end + 1)); };
    tails.add(finish);
    response.on('close', () => tails.delete(finish));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as {port: number};
  return {
    url: `http://127.0.0.1:${address.port}/opening.mp4`,
    stats: () => ({requests, ranges, released}),
    release() { released = true; [...tails].forEach(finish => finish()); },
    async close() { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); },
  };
}

test('the real first frame is usable before the rest of the movie downloads', async ({page}) => {
  const film = await partialFilm();
  await page.route('**/ola-scroll-v16-scrub.mp4', route => route.continue({url: film.url}));
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true', {timeout: 10000});
    expect(film.stats().released).toBe(false);
    expect(film.stats().ranges).toBeGreaterThan(0);
    await expect(page.locator('.lh-opening-video')).not.toHaveAttribute('src', /^blob:/);
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
    await page.locator('.site-nav .lang-btn').click();
    await expect(page.locator('#site-language-options')).toBeVisible();
    await page.keyboard.press('Escape');
    film.release();
    await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
    await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
  } finally { await film.close(); }
});

test('buffering preserves both readable chapters and late video arrival keeps the scroll position', async ({page}) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/ola-scroll-v16-scrub.mp4', async route => { await pending; await route.continue().catch(() => {}); });
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-opening')).toHaveAttribute('data-video-mode', 'true');
    await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
    await expect(page.locator('.lh-ola-copy')).not.toHaveAttribute('inert');
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-poster', 'end');
    const before = await page.evaluate(() => scrollY);
    release();
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
    expect(Math.abs(await page.evaluate(() => scrollY) - before)).toBeLessThan(2);
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1');
  } finally { release(); }
});

test('a slow distant range shows readable copy and resumes without disabling motion', async ({page}) => {
  const film = await partialFilm();
  await page.route('**/ola-scroll-v16-scrub.mp4', route => route.continue({url: film.url}));
  try {
    await page.goto('/zh-hant', {waitUntil: 'domcontentloaded'});
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true', {timeout: 10000});
    await page.evaluate(() => scrollTo({top: innerHeight * 2.85 * .92, behavior: 'instant'}));
    await expect(page.locator('.lh-ola-copy')).toHaveCSS('opacity', '1', {timeout: 7000});
    await expect(page.locator('.lh-opening')).not.toHaveAttribute('data-static-opening');
    await expect(page.locator('.lh-opening-video')).toHaveAttribute('src', /ola-scroll-v16-scrub.mp4/);
    expect(film.stats().released).toBe(false);
    film.release();
    await expect(page.locator('.lh-video-layer')).toHaveAttribute('data-ready', 'true');
    await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
    await expect(page.locator('.lh-hero-copy')).toHaveCSS('opacity', '1');
  } finally { await film.close(); }
});
