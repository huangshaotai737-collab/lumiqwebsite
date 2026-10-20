#!/usr/bin/env node
// Offline, read-only preflight. Never connects to a DB or executes migration SQL.
import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const baselineVersion = '20260826165924';
const waitlistColumns = { id: 'uuid', email: 'text', source: 'text', consent_version: 'text', created_at: 'timestamp with time zone' };
const schemaDefinitions = {
  'public.waitlist_signups': { columns: waitlistColumns, primaryKey: ['id'], unique: [['email']], rlsEnabled: true },
  'public.profiles': { columns: { user_id: 'uuid', display_name: 'text', locale: 'text', shipping_address: 'jsonb', access_state: 'text' }, primaryKey: ['user_id'], unique: [], rlsEnabled: true },
  'public.staff_memberships': { columns: { user_id: 'uuid', role: 'text', active: 'boolean' }, primaryKey: ['user_id'], unique: [], rlsEnabled: true },
  'public.audit_events': { columns: { id: 'uuid', actor_id: 'uuid', action: 'text', entity_type: 'text', entity_id: 'uuid', summary: 'jsonb', created_at: 'timestamp with time zone' }, primaryKey: ['id'], unique: [], rlsEnabled: true },
};
schemaDefinitions['public.staff_invites'] = { columns: {id:'uuid',email:'text',role:'text',token_digest:'text',created_by:'uuid',created_at:'timestamp with time zone',expires_at:'timestamp with time zone',delivered_at:'timestamp with time zone',accepted_at:'timestamp with time zone',accepted_by:'uuid',revoked_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true };
const fail = (code) => { throw new Error(code); };
const canonical = (value) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);

try {
  const options = {};
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 2) {
    if (!['--remote-manifest', '--migrations-dir'].includes(args[i]) || !args[i + 1] || options[args[i]]) fail('INVALID_ARGUMENTS');
    options[args[i]] = args[i + 1];
  }
  if (!options['--remote-manifest']) fail('REMOTE_MANIFEST_REQUIRED');
  const directory = options['--migrations-dir'] || path.join(root, 'supabase/migrations');
  const files = (await readdir(directory)).filter((name) => /^\d{14}_.+\.sql$/.test(name)).sort();
  const local = new Map();
  for (const file of files) {
    const version = file.slice(0, 14);
    if (local.has(version)) fail('DUPLICATE_LOCAL_MIGRATION');
    const sha256 = createHash('sha256').update(await readFile(path.join(directory, file))).digest('hex');
    local.set(version, { file, sha256 });
  }
  const remote = JSON.parse(await readFile(options['--remote-manifest'], 'utf8'));
  if (!remote || !Array.isArray(remote.migrations) || !remote.tables || Array.isArray(remote.tables) || typeof remote.tables !== 'object') fail('INVALID_REMOTE_MANIFEST');
  const seen = new Set();
  for (const migration of remote.migrations) {
    if (!migration || !/^\d{14}$/.test(migration.version) || !/^[a-f0-9]{64}$/.test(migration.sha256) || seen.has(migration.version)) fail('INVALID_REMOTE_MANIFEST');
    seen.add(migration.version);
    const candidate = local.get(migration.version);
    if (!candidate) fail('UNKNOWN_REMOTE_MIGRATION');
    if (candidate.sha256 !== migration.sha256) fail('MIGRATION_CHECKSUM_MISMATCH');
  }
  const applied = [...seen].sort();
  if (canonical(applied) !== canonical([...local.keys()].slice(0, applied.length))) fail('NON_PREFIX_REMOTE_HISTORY');
  if (!seen.has(baselineVersion) && remote.tables['public.waitlist_signups']) fail('UNTRACKED_WAITLIST_BASELINE');
  const identityApplied = applied.some((version) => local.get(version).file.endsWith('_admin_identity.sql'));
  const expectedTables = seen.has(baselineVersion) ? ['public.waitlist_signups'] : [];
  if (identityApplied) expectedTables.push('public.profiles', 'public.staff_memberships', 'public.audit_events');
  const staffApplied = applied.some((version) => local.get(version).file.endsWith('_staff_management.sql'));
  if(staffApplied) expectedTables.push('public.staff_invites');
  for (const table of expectedTables) {
    if (canonical(remote.tables[table]) !== canonical(schemaDefinitions[table])) fail(table === 'public.waitlist_signups' ? 'WAITLIST_SCHEMA_MISMATCH' : table === 'public.staff_invites' ? 'STAFF_SCHEMA_MISMATCH' : 'IDENTITY_SCHEMA_MISMATCH');
  }
  if (canonical(Object.keys(remote.tables).sort()) !== canonical(expectedTables.sort())) fail('UNRECOGNIZED_SCHEMA_INVENTORY');
  const pending = [...local.keys()].filter((version) => !seen.has(version));
  process.stdout.write(`BASELINE_VERIFIED: ${seen.size} applied, ${pending.length} pending local migrations. Read-only check; no DDL executed.\n`);
} catch (error) {
  // Never echo manifest contents or database credentials, even on malformed input.
  const code = /^[A-Z_]+$/.test(error.message) ? error.message : 'INVALID_REMOTE_MANIFEST';
  process.stderr.write(`${code}: baseline not verified; reconcile read-only evidence before any remote migration.\n`);
  process.exitCode = 1;
}
