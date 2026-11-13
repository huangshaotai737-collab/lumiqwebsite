// Provision the explicitly configured Linux media validator during Vercel builds.
// Runtime never downloads executables or accepts a path supplied by an upload.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir, mkdtemp, writeFile, readFile, chmod, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

if (process.platform !== 'linux' || process.arch !== 'x64') {
  throw new Error('Vercel media deployment requires Linux x64. Local development uses MEDIA_FFPROBE_PATH.');
}
const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./ffprobe-linux.json', import.meta.url), 'utf8'));
const folder = await mkdtemp(path.join(tmpdir(), 'lumiq-ffprobe-build-'));
try {
  const response = await fetch(manifest.url, {signal: AbortSignal.timeout(180000)});
  if (!response.ok) throw new Error('Media validator download failed');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) {
    throw new Error('Media validator archive checksum mismatch');
  }
  const archive = path.join(folder, 'ffprobe.tar.xz');
  await writeFile(archive, bytes);
  const prefix = manifest.name.replace(/\.tar\.xz$/, '');
  execFileSync('tar', ['-xJf', archive, '-C', folder, `${prefix}/bin/ffprobe`, `${prefix}/LICENSE.txt`]);
  const vendor = path.join(root, 'vendor');
  await mkdir(vendor, {recursive: true});
  const binary = path.join(vendor, 'ffprobe');
  await writeFile(binary, await readFile(path.join(folder, prefix, 'bin/ffprobe')));
  await chmod(binary, 0o755);
  await writeFile(path.join(vendor, 'ffprobe.LICENSE'), await readFile(path.join(folder, prefix, 'LICENSE.txt')));
  execFileSync(binary, ['-version'], {stdio: 'ignore', timeout: 10000});
  console.log('Pinned FFprobe installed and executable for media validation.');
} finally {
  await rm(folder, {recursive: true, force: true});
}
