// After the deployment's media preparation and Next build, run:
// node --test tests/packaging/media-validator.test.mjs
// ADMIN_BUILD_ROOT can point at an isolated admin build instead of this app.
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const admin = process.env.ADMIN_BUILD_ROOT
  ? path.resolve(process.env.ADMIN_BUILD_ROOT)
  : fileURLToPath(new URL('../../', import.meta.url));

// Both operations inspect uploaded bytes with the configured external binary.
// Its environment-selected path cannot be discovered by static import tracing.
for (const route of ['api/media/complete', 'api/content/publish']) {
  test(`${route} packages the Linux media validator and its license`, async () => {
    const traceFile = path.join(admin, '.next/server/app', route, 'route.js.nft.json');
    const trace = JSON.parse(await readFile(traceFile, 'utf8'));
    const packagedFiles = new Set(trace.files.map((file) => path.resolve(path.dirname(traceFile), file)));

    for (const name of ['ffprobe', 'ffprobe.LICENSE']) {
      const required = path.join(admin, 'vendor', name);
      assert.ok(packagedFiles.has(required), `${route} deployment trace is missing vendor/${name}`);
      assert.ok((await stat(required)).isFile(), `Traced vendor/${name} must exist in the build`);
    }

    const binary = await readFile(path.join(admin, 'vendor/ffprobe'));
    assert.deepEqual([...binary.subarray(0, 4)], [0x7f, 0x45, 0x4c, 0x46], 'FFprobe must be a real Linux ELF executable');
    assert.ok((await stat(path.join(admin, 'vendor/ffprobe'))).mode & 0o111, 'FFprobe must remain executable');
    const license = await readFile(path.join(admin, 'vendor/ffprobe.LICENSE'), 'utf8');
    assert.match(license, /GNU LESSER GENERAL PUBLIC LICENSE/, 'The distributed FFprobe license must be included');
  });
}
