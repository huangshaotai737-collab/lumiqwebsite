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

const identityTables = {
 'public.profiles':{columns:{user_id:'uuid',display_name:'text',locale:'text',shipping_address:'jsonb',access_state:'text'},primaryKey:['user_id'],unique:[],rlsEnabled:true},
 'public.staff_memberships':{columns:{user_id:'uuid',role:'text',active:'boolean'},primaryKey:['user_id'],unique:[],rlsEnabled:true},
 'public.audit_events':{columns:{id:'uuid',actor_id:'uuid',action:'text',entity_type:'text',entity_id:'uuid',summary:'jsonb',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true},
};
const inviteTable={columns:{id:'uuid',email:'text',role:'text',token_digest:'text',created_by:'uuid',created_at:'timestamp with time zone',expires_at:'timestamp with time zone',delivered_at:'timestamp with time zone',accepted_at:'timestamp with time zone',accepted_by:'uuid',revoked_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true};
test('staff migration inventory recognizes only exact staff invite schema and rejects drift/missing columns',async()=>{
 const migrations=await import('node:fs/promises').then(fs=>fs.readdir(new URL('../../supabase/migrations',import.meta.url)));
 const fixture=await mkdtemp(path.join(tmpdir(),'lumiq-team-baseline-'));
 try {
  const input=manifest();input.migrations=[];Object.assign(input.tables,identityTables,{'public.staff_invites':inviteTable});
  for(const file of migrations.filter(file=>/^\d{14}_.*\.sql$/.test(file) && file <= migrations.find(name=>name.endsWith('_staff_management.sql'))).sort()) {
   const contents=await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url));input.migrations.push({version:file.slice(0,14),sha256:createHash('sha256').update(contents).digest('hex')});
  }
  const target=path.join(fixture,'remote.json');
  const run=async()=>{await writeFile(target,JSON.stringify(input));return spawnSync(process.execPath,[script,'--remote-manifest',target],{encoding:'utf8'});};
  assert.equal((await run()).status,0,'exact new staff schema is accepted');
  input.tables['public.staff_invites']={...inviteTable,columns:{...inviteTable.columns,token_digest:'uuid'}};
  assert.match((await run()).stderr,/STAFF_SCHEMA_MISMATCH/);
  input.tables['public.staff_invites']={...inviteTable,columns:{...inviteTable.columns}};
  delete input.tables['public.staff_invites'].columns.delivered_at;assert.match((await run()).stderr,/STAFF_SCHEMA_MISMATCH/);
  delete input.tables['public.staff_invites'];assert.match((await run()).stderr,/STAFF_SCHEMA_MISMATCH/);
 } finally {await rm(fixture,{recursive:true,force:true});}
});

const contentTables = {
 'public.content_drafts': { columns: {id:'uuid',version:'integer',snapshot:'jsonb',status:'text',created_by:'uuid',updated_by:'uuid',created_at:'timestamp with time zone',updated_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true },
 'public.content_releases': { columns: {id:'uuid',snapshot:'jsonb',draft_id:'uuid',draft_version:'integer',rollback_of:'uuid',created_by:'uuid',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[],rlsEnabled:true },
 'public.content_publication': { columns: {singleton:'boolean',release_id:'uuid',updated_at:'timestamp with time zone'},primaryKey:['singleton'],unique:[],rlsEnabled:true },
};
test('content inventory requires all exact tables and rejects drift, missing tables, and unknown schema', async () => {
 const fixture = await mkdtemp(path.join(tmpdir(), 'lumiq-content-baseline-'));
 try {
  const input = manifest(); input.migrations = []; Object.assign(input.tables, identityTables, {'public.staff_invites':inviteTable},structuredClone(contentTables));
  const files = await import('node:fs/promises').then(fs=>fs.readdir(new URL('../../supabase/migrations',import.meta.url)));
  for(const file of files.filter(file=>/^\d{14}_.*\.sql$/.test(file) && file <= files.find(name=>name.endsWith('_content_releases.sql'))).sort()) {
   input.migrations.push({version:file.slice(0,14),sha256:createHash('sha256').update(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url))).digest('hex')});
  }
  const target=path.join(fixture,'remote.json');
  const run=async()=>{await writeFile(target,JSON.stringify(input));return spawnSync(process.execPath,[script,'--remote-manifest',target],{encoding:'utf8'});};
  assert.equal((await run()).status,0,'exact content inventory accepted');
  for(const table of Object.keys(contentTables)) {
   input.tables[table].columns.snapshot='text'; assert.match((await run()).stderr,/CONTENT_SCHEMA_MISMATCH/);
   input.tables[table]=structuredClone(contentTables[table]);
   delete input.tables[table]; assert.match((await run()).stderr,/CONTENT_SCHEMA_MISMATCH/);
   input.tables[table]=structuredClone(contentTables[table]);
  }
  input.tables['public.unreviewed']={columns:{id:'uuid'}};
  assert.match((await run()).stderr,/UNRECOGNIZED_SCHEMA_INVENTORY/);
 } finally { await rm(fixture,{recursive:true,force:true}); }
});

const mediaTable = { columns: {id:'uuid',created_by:'uuid',file_name:'text',advertised_size:'bigint',mime:'text',usage_key:'text',original_path:'text',metadata:'jsonb',release_path:'text',status:'text',created_at:'timestamp with time zone'},primaryKey:['id'],unique:[['original_path'],['release_path']],rlsEnabled:true };
test('media inventory recognizes exact columns and rejects missing, drifted and unknown fields', async () => {
 const fixture=await mkdtemp(path.join(tmpdir(),'lumiq-media-baseline-'));
 try {
  const input=manifest(); input.migrations=[];Object.assign(input.tables,identityTables,{'public.staff_invites':inviteTable},structuredClone(contentTables),{'public.media_assets':structuredClone(mediaTable)});
  const files=await import('node:fs/promises').then(fs=>fs.readdir(new URL('../../supabase/migrations',import.meta.url)));
  for(const file of files.filter(file=>/^\d{14}_.*\.sql$/.test(file)).sort())input.migrations.push({version:file.slice(0,14),sha256:createHash('sha256').update(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url))).digest('hex')});
  input.tables['public.content_drafts'].columns.base_release_id='uuid';
  const target=path.join(fixture,'remote.json');const run=async()=>{await writeFile(target,JSON.stringify(input));return spawnSync(process.execPath,[script,'--remote-manifest',target],{encoding:'utf8'});};
  assert.equal((await run()).status,0,'exact media schema accepted');
  input.tables['public.media_assets'].columns.advertised_size='integer';assert.match((await run()).stderr,/MEDIA_SCHEMA_MISMATCH/);
  input.tables['public.media_assets']=structuredClone(mediaTable);input.tables['public.media_assets'].columns.browser_public='boolean';assert.match((await run()).stderr,/MEDIA_SCHEMA_MISMATCH/);
  delete input.tables['public.media_assets'];assert.match((await run()).stderr,/MEDIA_SCHEMA_MISMATCH/);
 }finally{await rm(fixture,{recursive:true,force:true});}
});
