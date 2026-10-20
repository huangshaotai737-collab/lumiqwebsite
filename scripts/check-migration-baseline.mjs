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
Object.assign(schemaDefinitions, {
 'public.content_drafts': { columns: {id:'uuid',version:'integer',snapshot:'jsonb',status:'text',created_by:'uuid',updated_by:'uuid',created_at:'timestamp with time zone',updated_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true },
 'public.content_releases': { columns: {id:'uuid',snapshot:'jsonb',draft_id:'uuid',draft_version:'integer',rollback_of:'uuid',created_by:'uuid',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true },
 'public.content_publication': { columns: {singleton:'boolean',release_id:'uuid',updated_at:'timestamp with time zone'},primaryKey:['singleton'],unique:[],rlsEnabled:true },
});
schemaDefinitions['public.media_assets'] = { columns: {id:'uuid',created_by:'uuid',file_name:'text',advertised_size:'bigint',mime:'text',usage_key:'text',original_path:'text',metadata:'jsonb',release_path:'text',status:'text',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[['original_path'],['release_path']],rlsEnabled:true };
schemaDefinitions['public.waitlist_operations'] = {columns:{signup_id:'uuid',status:'text',note:'text',version:'integer'},primaryKey:['signup_id'],unique:[],rlsEnabled:true};
schemaDefinitions['public.customer_notes'] = {columns:{id:'uuid',user_id:'uuid',note:'text',created_by:'uuid',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true};
const commerceTables = {
 'public.catalog_offerings':{columns:{id:'uuid',product_id:'text',name:'text',currency:'text',unit_minor:'bigint',confirmed:'boolean',enabled:'boolean',version:'integer'},primaryKey:['id'],unique:[['product_id']],rlsEnabled:true},
 'public.commerce_settings':{columns:{singleton:'boolean',orders_enabled:'boolean',approved_terms_release_id:'uuid',approved_terms_fingerprint:'text',version:'integer'},primaryKey:['singleton'],unique:[],rlsEnabled:true},
 'public.customer_orders':{columns:{id:'uuid',user_id:'uuid',idempotency_key:'text',request_digest:'text',status:'text',payment_status:'text',fulfillment_status:'text',currency:'text',items_minor:'bigint',shipping_minor:'bigint',tax_minor:'bigint',payable_minor:'bigint',shipping_address:'jsonb',terms_release_id:'uuid',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[['user_id','idempotency_key']],rlsEnabled:true},
 'public.order_items':{columns:{order_id:'uuid',sku_id:'uuid',product_id:'text',name:'text',quantity:'integer',unit_minor:'bigint',offering_version:'integer'},primaryKey:['order_id','sku_id'],unique:[],rlsEnabled:true},
};
const orderNotesTable={columns:{id:'uuid',order_id:'uuid',note:'text',created_by:'uuid',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true};
schemaDefinitions['public.order_notes']=orderNotesTable;
Object.assign(schemaDefinitions,commerceTables);
const paymentTables = {"public.payment_attempts": {"columns": {"id": "uuid", "order_id": "uuid", "idempotency_key": "text", "status": "text", "created_at": "timestamp with time zone"}, "primaryKey": ["id"], "unique": [["order_id", "idempotency_key"]], "rlsEnabled": true}, "public.payment_events": {"columns": {"id": "uuid", "provider": "text", "event_id": "text", "transaction_id": "text", "order_id": "uuid", "amount_minor": "bigint", "currency": "text", "status": "text", "created_at": "timestamp with time zone"}, "primaryKey": ["id"], "unique": [["provider", "event_id"]], "rlsEnabled": true}, "public.payment_refunds": {"columns": {"id": "uuid", "order_id": "uuid", "amount_minor": "bigint", "idempotency_key": "text", "status": "text", "created_at": "timestamp with time zone"}, "primaryKey": ["id"], "unique": [["order_id", "idempotency_key"]], "rlsEnabled": true}};
Object.assign(schemaDefinitions,paymentTables);
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
  const contentApplied = applied.some(version => local.get(version).file.endsWith('_content_releases.sql'));
  if (contentApplied) expectedTables.push('public.content_drafts','public.content_releases','public.content_publication');
  const mediaApplied = applied.some(version => local.get(version).file.endsWith('_media_assets.sql'));
  if (mediaApplied) { expectedTables.push('public.media_assets'); schemaDefinitions['public.content_drafts'].columns.base_release_id = 'uuid'; }
  const operationsApplied = applied.some(version => local.get(version).file.endsWith('_customer_operations.sql'));
  if (operationsApplied) expectedTables.push('public.waitlist_operations','public.customer_notes');
  const commerceApplied = applied.some(version => local.get(version).file.endsWith('_orders_and_catalog.sql'));
  if(commerceApplied) expectedTables.push(...Object.keys(commerceTables));
  const orderOperationsApplied=applied.some(version=>local.get(version).file.endsWith('_order_operations.sql'));
  if(orderOperationsApplied)expectedTables.push('public.order_notes');
  if(applied.some(version=>local.get(version).file.endsWith('_payment_contracts.sql'))) expectedTables.push(...Object.keys(paymentTables));
  for (const table of expectedTables) {
    if (canonical(remote.tables[table]) !== canonical(schemaDefinitions[table])) fail(Object.hasOwn(paymentTables,table) ? 'PAYMENT_SCHEMA_MISMATCH' : table==='public.order_notes' ? 'ORDER_OPERATIONS_SCHEMA_MISMATCH' : Object.hasOwn(commerceTables,table) ? 'COMMERCE_SCHEMA_MISMATCH' : ['public.waitlist_operations','public.customer_notes'].includes(table) ? 'CUSTOMER_OPERATIONS_SCHEMA_MISMATCH' : table === 'public.waitlist_signups' ? 'WAITLIST_SCHEMA_MISMATCH' : table === 'public.staff_invites' ? 'STAFF_SCHEMA_MISMATCH' : table === 'public.media_assets' ? 'MEDIA_SCHEMA_MISMATCH' : table.startsWith('public.content_') ? 'CONTENT_SCHEMA_MISMATCH' : 'IDENTITY_SCHEMA_MISMATCH');
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
