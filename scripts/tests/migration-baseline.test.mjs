import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = new URL('../check-migration-baseline.mjs', import.meta.url).pathname;
const baseline = '20260826165924';
const nextVersion = '20261020040045';
const nextSql = '-- identity fixture\n';
const columns = { id: 'uuid', email: 'text', source: 'text', consent_version: 'text', created_at: 'timestamp with time zone' };
const sql = await readFile(new URL('../../supabase/migrations/20260826165924_create_waitlist_signups.sql', import.meta.url), 'utf8');
const manifest = () => ({ migrations: [{ version: baseline, sha256: createHash('sha256').update(sql).digest('hex') }], tables: { 'public.waitlist_signups': { columns, primaryKey: ['id'], unique: [['email']], rlsEnabled: true } } });

async function check(input) {
  const fixture = await mkdtemp(path.join(tmpdir(), 'lumiq-baseline-'));
  try {
    await mkdir(path.join(fixture, 'migrations'));
    await writeFile(path.join(fixture, 'migrations', `${baseline}_create_waitlist_signups.sql`), sql);
    await writeFile(path.join(fixture, 'migrations', `${nextVersion}_admin_identity.sql`), nextSql);
    const inventory = path.join(fixture, 'remote.json');
    const before = JSON.stringify(input);
    await writeFile(inventory, before);
    const result = spawnSync(process.execPath, [script, '--remote-manifest', inventory, '--migrations-dir', path.join(fixture, 'migrations')], { encoding: 'utf8' });
    assert.equal(await readFile(inventory, 'utf8'), before, 'read-only checker never changes inventory');
    assert.equal(await readFile(path.join(fixture, 'migrations', `${baseline}_create_waitlist_signups.sql`), 'utf8'), sql, 'checker never executes or rewrites SQL');
    return result;
  } finally { await rm(fixture, { recursive: true, force: true }); }
}

test('accepts exact historical baseline and reports pending local migrations', async () => {
  const result = await check(manifest());
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /BASELINE_VERIFIED: 1 applied, 1 pending/);
});
test('unknown remote migration fails closed without modifying supplied evidence', async () => {
  const input = manifest();
  input.migrations.push({ version: '20990101000000', sha256: '0'.repeat(64) });
  const result = await check(input);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /UNKNOWN_REMOTE_MIGRATION/);
});
test('changed historical migration fails closed', async () => {
  const input = manifest();
  input.migrations[0].sha256 = '0'.repeat(64);
  assert.match((await check(input)).stderr, /MIGRATION_CHECKSUM_MISMATCH/);
});
test('untracked pre-existing waitlist needs manual reconciliation', async () => {
  const input = manifest();
  input.migrations = [];
  assert.match((await check(input)).stderr, /UNTRACKED_WAITLIST_BASELINE/);
});
test('schema drift, missing schema, and unverified checksum fail closed', async () => {
  const drift = manifest();
  drift.tables['public.waitlist_signups'].columns = { ...columns, email: 'uuid' };
  assert.match((await check(drift)).stderr, /WAITLIST_SCHEMA_MISMATCH/);
  const missing = manifest();
  missing.tables = {};
  assert.match((await check(missing)).stderr, /WAITLIST_SCHEMA_MISMATCH/);
  const unverified = manifest();
  delete unverified.migrations[0].sha256;
  assert.match((await check(unverified)).stderr, /INVALID_REMOTE_MANIFEST/);
});
test('malformed and non-prefix migration histories fail closed', async () => {
  assert.equal((await check({})).status, 1);
  const nonPrefix = manifest();
  nonPrefix.migrations = [{ version: nextVersion, sha256: createHash('sha256').update(nextSql).digest('hex') }];
  const result = await check(nonPrefix);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /NON_PREFIX_REMOTE_HISTORY/);
  const duplicate = manifest();
  duplicate.migrations.push(duplicate.migrations[0]);
  assert.match((await check(duplicate)).stderr, /INVALID_REMOTE_MANIFEST/);
});
