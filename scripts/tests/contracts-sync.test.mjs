import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const destinations = ['related/admin/lib/generated/platform/core.ts', 'related/website/lib/generated/platform/core.ts'];

test('generated_contracts_match_the_source', async () => {
  const result = spawnSync(process.execPath, ['scripts/sync-platform-contracts.mjs', '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const source = await readFile(path.join(root, 'contracts/core.ts'), 'utf8');
  for (const destination of destinations) assert.ok((await readFile(path.join(root, destination), 'utf8')).endsWith(source));
});

test('contract_sync_detects_and_repairs_missing_or_stale_copies', async () => {
  const fixture = await mkdtemp(path.join(tmpdir(), 'lumiq-contract-sync-'));
  try {
    await mkdir(path.join(fixture, 'scripts'));
    await mkdir(path.join(fixture, 'contracts'));
    await cp(path.join(root, 'scripts/sync-platform-contracts.mjs'), path.join(fixture, 'scripts/sync-platform-contracts.mjs'));
    await writeFile(path.join(fixture, 'contracts/core.ts'), 'export type Locale = "en";\n');
    await mkdir(path.join(fixture, 'contracts/nested'));
    await writeFile(path.join(fixture, 'contracts/nested/content.ts'), 'export type Content = string;\n');
    const run = (...args) => spawnSync(process.execPath, ['scripts/sync-platform-contracts.mjs', ...args], { cwd: fixture, encoding: 'utf8' });
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
    assert.ok((await readFile(path.join(fixture, 'related/admin/lib/generated/platform/nested/content.ts'), 'utf8')).endsWith('export type Content = string;\n'));
    const generated = await readFile(path.join(fixture, destinations[0]), 'utf8');
    assert.ok(generated.endsWith('export type Locale = "en";\n'));
    await writeFile(path.join(fixture, destinations[1]), 'stale');
    assert.equal(run('--check').status, 1);
    assert.equal(run().status, 0);
    assert.equal(run('--check').status, 0);
  } finally { await rm(fixture, { recursive: true, force: true }); }
});
