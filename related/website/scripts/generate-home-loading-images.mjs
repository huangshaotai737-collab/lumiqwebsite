import {createHash} from 'node:crypto';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

// A real, decoded 480px image is the homepage entry gate. Keep its source URLs
// canonical so the caller can resolve a published CMS override before preloading.
const root = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = path.join(root, 'public');
const outputRoot = path.join(publicRoot, 'assets/home-loading-480');
const manifestPath = path.join(root, 'lib/home-loading-image-manifest.json');
const homeImages = JSON.parse(await readFile(path.join(root, 'lib/home-image-manifest.json'), 'utf8'));
export const homeLoadingSources = [...new Set([
  ...Object.keys(homeImages),
  '/assets/brand/lumiq-logo-transparent-dark.png',
  '/assets/home-products-refined-20260907/ola-original-transparent.webp',
  '/assets/home-video/ola-scroll-v16-start-20260909.webp',
  '/assets/home-video/ola-scroll-v16-end-20260909.webp',
  '/assets/mobile-backgrounds-20260914/hero-unified.webp',
  '/assets/mobile-backgrounds-20260914/ola-go-ui.webp',
  '/assets/films-20260908/everyday-companion.jpg',
  '/assets/films-20260908/worlds-together.jpg',
  '/assets/films-20260908/welcome-home.jpg',
  '/assets/character-20261012/poster-clean.png',
  '/assets/character-20261012/settled-clean.png',
  '/assets/home-safety-20261002/story-world-family.jpg',
  '/assets/site-backgrounds-20261108/pearl-flow-poster.webp',
  '/assets/site-backgrounds-20261108/pearl-flow-desktop.webp',
  '/assets/site-backgrounds-20261108/pearl-flow-compact.webp',
  '/assets/site-backgrounds-20261108/pearl-flow-mobile.webp',
  '/assets/chapter-backgrounds-20260910/products.webp',
  '/assets/home-interactive/pearl-light.webp',
])].sort();

const check = process.argv.includes('--check');
if (!check) await mkdir(outputRoot, {recursive:true});
const manifest = {};
let totalBytes = 0;
for (const source of homeLoadingSources) {
  const input = await readFile(path.join(publicRoot, source.slice(1)));
  if (input.subarray(0, 80).toString().startsWith('version https://git-lfs.github.com/spec/v1')) {
    throw new Error(`Missing Git LFS image data: ${source}`);
  }
  const original = await sharp(input).metadata();
  if (!original.width || !original.height) throw new Error(`Invalid source image: ${source}`);
  const digest = createHash('sha256').update(input).update('width=480;quality=80;webp-v1').digest('hex').slice(0, 12);
  const name = `${path.basename(source, path.extname(source))}-${digest}-480.webp`;
  const filePath = path.join(outputRoot, name);
  const buffer = await sharp(input).rotate().resize({width:480, withoutEnlargement:true}).webp({quality:80}).toBuffer();
  const metadata = await sharp(buffer).metadata();
  const expectedWidth = Math.min(480, original.width);
  if (metadata.width !== expectedWidth || !metadata.height) throw new Error(`Incorrect derivative dimensions: ${source}`);
  if (original.hasAlpha && !metadata.hasAlpha) throw new Error(`Lost source transparency: ${source}`);
  if (check) {
    const existing = await readFile(filePath);
    if (!existing.equals(buffer)) throw new Error(`Stale 480px derivative: ${filePath}`);
  } else await writeFile(filePath, buffer);
  manifest[source] = `/assets/home-loading-480/${name}`;
  totalBytes += buffer.length;
}
const json = JSON.stringify(manifest, null, 2)+'\n';
if (check) {
  if (await readFile(manifestPath, 'utf8') !== json) throw new Error('Stale home loading image manifest');
} else await writeFile(manifestPath, json);
console.log(`${check ? 'Verified' : 'Generated'} ${homeLoadingSources.length} homepage 480px images (${totalBytes.toLocaleString()} bytes), with source data, dimensions and alpha checked.`);
