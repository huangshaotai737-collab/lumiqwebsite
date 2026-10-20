#!/usr/bin/env node
// Destructive ONLY to the synthetic local lumiq-platform test database.
// Never connects to a remote project and never prints local credentials.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baselineVersion = '20260826165924';
const project = 'lumiq-platform';
const supabase = process.env.SUPABASE_CLI || 'supabase';
const docker = process.env.DOCKER_CLI || 'docker';

function run(binary, args, input) {
  const result = spawnSync(binary, args, { cwd: root, encoding: 'utf8', input, timeout: 180_000 });
  if (result.error || result.status !== 0) throw new Error(`Local test command failed: ${binary} ${args.slice(0, 4).join(' ')} (exit ${result.status ?? 'unavailable'}).`);
  return result.stdout.trim();
}
function sql(statement) {
  return run(docker, ['exec', '-i', `supabase_db_${project}`, 'psql', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'postgres'], statement);
}
const snapshotQuery = `select json_build_object(
  'row', (select row_to_json(w) from public.waitlist_signups w where id='20000000-0000-0000-0000-000000000001'),
  'constraints', (select json_agg(x order by x.conname) from (select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.waitlist_signups'::regclass) x),
  'rls', (select relrowsecurity from pg_class where oid='public.waitlist_signups'::regclass),
  'anon_read', has_table_privilege('anon','public.waitlist_signups','select'),
  'service_insert', has_table_privilege('service_role','public.waitlist_signups','insert')
);`;

try {
  if (process.argv.length !== 3 || process.argv[2] !== '--local-test-only') throw new Error('Pass --local-test-only to reset the synthetic local lumiq-platform test database.');
  const config = await readFile(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  if (!/^project_id\s*=\s*"lumiq-platform"\s*$/m.test(config)) throw new Error('Refusing to reset an unexpected local project.');
  await readFile(new URL(`../supabase/migrations/${baselineVersion}_create_waitlist_signups.sql`, import.meta.url));
  process.stdout.write('Resetting isolated local test database to the historical baseline...\n');
  run(supabase, ['db', 'reset', '--local', '--version', baselineVersion]);
  sql(`insert into public.waitlist_signups(id,email,source,consent_version,created_at) values ('20000000-0000-0000-0000-000000000001','preservation@example.invalid','prelaunch','waitlist-v1','2026-01-01T00:00:00Z');`);
  const before = JSON.parse(sql(snapshotQuery));
  assert.ok(before.row, 'synthetic baseline row exists before upgrade');
  process.stdout.write('Applying actual pending migration files with migration up --local...\n');
  run(supabase, ['migration', 'up', '--local']);
  const after = JSON.parse(sql(snapshotQuery));
  assert.deepEqual(after, before, 'waitlist row, constraints, RLS and grants must survive upgrade unchanged');
  assert.equal(sql("select count(*) from information_schema.tables where table_schema='public' and table_name in ('profiles','staff_memberships','audit_events');"), '3', 'identity migration was applied');
  sql("delete from public.waitlist_signups where id='20000000-0000-0000-0000-000000000001';");
  process.stdout.write('PASS: id/email/created_at and all original row fields, constraints, RLS and grants preserved by actual local upgrade.\n');
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
