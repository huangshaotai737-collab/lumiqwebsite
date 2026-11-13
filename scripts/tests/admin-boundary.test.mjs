import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const admin = path.join(root, 'related/admin');

test('independent_admin_build', async () => {
  const pkg = JSON.parse(await readFile(path.join(admin, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.build, 'next build');
  assert.equal(pkg.scripts.dev, 'next dev --hostname 127.0.0.1 --port 4250');
  assert.equal(pkg.scripts['test:e2e'], 'playwright test -c playwright.platform.config.ts');
  await access(path.join(admin, 'package-lock.json'));
  for (const group of ['dependencies', 'devDependencies']) {
    for (const version of Object.values(pkg[group])) assert.match(version, /^\d+\.\d+\.\d+$/);
  }
});

test('admin_styles_and_sources_do_not_depend_on_website', async () => {
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await inspect(absolute);
      else if (/\.(css|tsx?|mjs)$/.test(entry.name)) {
        const source = await readFile(absolute, 'utf8');
        assert.doesNotMatch(source, /(?:\.\.\/)+website\//, absolute);
        assert.doesNotMatch(source, /@import[^;]*website/, absolute);
      }
    }
  }
  await inspect(path.join(admin, 'app'));
  await inspect(path.join(admin, 'features'));
});
