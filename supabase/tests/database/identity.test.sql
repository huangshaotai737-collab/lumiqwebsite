begin;
select plan(54);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'staff_memberships', 'staff authority exists');
select has_table('public', 'audit_events', 'audit exists');
select has_function('private', 'current_staff_role', array[]::text[], 'DB staff lookup exists');

insert into auth.users(id, email, raw_user_meta_data) values
 ('10000000-0000-0000-0000-000000000001', 'member-a@example.invalid', '{"role":"admin","access_state":"suspended"}'),
 ('10000000-0000-0000-0000-000000000002', 'member-b@example.invalid', '{}'),
 ('10000000-0000-0000-0000-000000000003', 'admin@example.invalid', '{}'),
 ('10000000-0000-0000-0000-000000000004', 'editor@example.invalid', '{}');
select is((select count(*)::int from public.profiles), 4, 'signup creates ordinary profiles');
select is((select access_state from public.profiles where user_id = '10000000-0000-0000-0000-000000000001'), 'active', 'metadata cannot set protected profile state');
select is((select count(*)::int from public.staff_memberships), 0, 'signup never grants staff');
insert into public.staff_memberships(user_id, role) values
 ('10000000-0000-0000-0000-000000000003','admin'),
 ('10000000-0000-0000-0000-000000000004','editor');

set local role anon;
select throws_ok('select * from public.profiles', '42501', 'permission denied for table profiles', 'anonymous cannot read profiles');
select throws_ok('select * from public.staff_memberships', '42501', 'permission denied for table staff_memberships', 'anonymous cannot read staff');
select throws_ok('select * from public.audit_events', '42501', 'permission denied for table audit_events', 'anonymous cannot read audit');
reset role;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","user_metadata":{"role":"admin"},"app_metadata":{"role":"admin"}}', true);
set local role authenticated;
select is(private.current_staff_role(), null::text, 'metadata cannot grant admin');
select is((select count(*)::int from public.profiles), 1, 'member only sees own profile');
select lives_ok($$update public.profiles set display_name = 'Member A', locale = 'ja', shipping_address = '{"city":"Tokyo"}' where user_id = '10000000-0000-0000-0000-000000000001'$$, 'member can edit own ordinary fields');
select is((select display_name from public.profiles), 'Member A', 'own profile edit persisted');
select results_eq($$update public.profiles set display_name = 'stolen' where user_id = '10000000-0000-0000-0000-000000000002' returning user_id$$, $$select null::uuid where false$$, 'member cannot edit another profile');
select throws_ok($$update public.profiles set access_state = 'suspended'$$, '42501', 'permission denied for table profiles', 'member cannot edit access_state');
select throws_ok($$update public.profiles set user_id = '10000000-0000-0000-0000-000000000002'$$, '42501', 'permission denied for table profiles', 'member cannot reassign profile ownership');
select throws_ok($$insert into public.profiles(user_id) values ('10000000-0000-0000-0000-000000000002')$$, '42501', 'permission denied for table profiles', 'member cannot create arbitrary profiles');
select throws_ok('delete from public.profiles', '42501', 'permission denied for table profiles', 'member cannot delete profiles');
select is((select count(*)::int from public.staff_memberships), 0, 'member cannot list employees');
select is((select count(*)::int from public.audit_events), 0, 'member cannot read staff audit');
select throws_ok($$insert into public.staff_memberships(user_id,role) values ('10000000-0000-0000-0000-000000000001','admin')$$, '42501', 'permission denied for table staff_memberships', 'member cannot self-promote');
select throws_ok($$update public.staff_memberships set role = 'admin'$$, '42501', 'permission denied for table staff_memberships', 'member cannot modify staff role');
select throws_ok($$select private.assert_staff_role(array['admin'])$$, '42501', 'FORBIDDEN', 'member cannot assert staff authority');
select throws_ok($$select private.append_audit('forged','profile','10000000-0000-0000-0000-000000000002','{}')$$, '42501', 'permission denied for function append_audit', 'member cannot forge audit');
select throws_ok($$insert into public.audit_events(action,entity_type,entity_id) values ('forged','profile','10000000-0000-0000-0000-000000000002')$$, '42501', 'permission denied for table audit_events', 'member cannot insert audit directly');
select throws_ok('update public.audit_events set summary = ''{}''', '42501', 'permission denied for table audit_events', 'member cannot edit audit');
select throws_ok('delete from public.audit_events', '42501', 'permission denied for table audit_events', 'member cannot delete audit');
reset role;

select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
select is(private.current_staff_role(), 'admin', 'active DB admin recognized');
select lives_ok($$select private.assert_staff_role(array['admin'])$$, 'allowed staff role passes');
select throws_ok($$select private.assert_staff_role(array['operations'])$$, '42501', 'FORBIDDEN', 'staff helper checks allowed roles');
select is((select count(*)::int from public.staff_memberships), 1, 'staff can inspect own membership');
select throws_ok($$update public.staff_memberships set active = false$$, '42501', 'permission denied for table staff_memberships', 'staff cannot directly modify own active status');
reset role;
select private.append_audit('content.test','profile','10000000-0000-0000-0000-000000000001','{"changed":["display_name"]}');
select is((select actor_id from public.audit_events limit 1), '10000000-0000-0000-0000-000000000003'::uuid, 'audit records authenticated actor');
select throws_ok('update public.audit_events set summary = ''{}''', '55000', 'audit events are append-only', 'audit cannot be rewritten by privileged application function');
select throws_ok('delete from public.audit_events', '55000', 'audit events are append-only', 'audit cannot be deleted by privileged application function');
set local role authenticated;
select is((select count(*)::int from public.audit_events), 1, 'active admin can read complete audit');
reset role;
update public.staff_memberships set active = false where user_id = '10000000-0000-0000-0000-000000000003';
set local role authenticated;
select is(private.current_staff_role(), null::text, 'staff disablement takes effect with same claims');
select throws_ok($$select private.assert_staff_role(array['admin'])$$, '42501', 'FORBIDDEN', 'disabled staff loses sensitive access immediately');
select is((select count(*)::int from public.audit_events), 0, 'disabled staff loses audit read');
reset role;
update public.profiles set access_state = 'suspended' where user_id = '10000000-0000-0000-0000-000000000001';
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
select results_eq($$update public.profiles set display_name = 'blocked' returning user_id$$, $$select null::uuid where false$$, 'suspended member cannot edit profile');
reset role;
update public.profiles set access_state = 'anonymized' where user_id = '10000000-0000-0000-0000-000000000004';
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
set local role authenticated;
select is(private.current_staff_role(), null::text, 'anonymized profile has no staff authority');
reset role;
-- Null actors are reserved for explicit, trusted system/bootstrap workflows.
select set_config('request.jwt.claims', '{}', true);
select throws_ok($$select private.append_audit('orders.created','order','10000000-0000-0000-0000-000000000001','{}')$$, '42501', 'audit actor required', 'ordinary audit actions require an actor');
select lives_ok($$select private.append_audit('team.bootstrap','staff','10000000-0000-0000-0000-000000000003','{}')$$, 'trusted bootstrap permits null actor');
select lives_ok($$select private.append_audit('system.test','system','10000000-0000-0000-0000-000000000003','{}')$$, 'explicit trusted system workflow permits null actor');
select is((select count(*)::int from public.audit_events where actor_id is null), 2, 'system audit rows preserve null actor');
select throws_ok('truncate public.audit_events', '55000', 'audit events are append-only', 'audit cannot be truncated');
select set_config('request.jwt.claims', '{"sub":"10000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select lives_ok($$select private.append_audit('orders.created','order','10000000-0000-0000-0000-000000000001','{}')$$, 'trusted customer routine may audit non-staff actor');
set local role service_role;
select throws_ok('delete from public.audit_events', '42501', 'permission denied for table audit_events', 'server service role cannot delete audit directly');
reset role;
select ok(not has_function_privilege('anon','private.current_staff_role()','execute'), 'anonymous has no helper grant');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and (pg_get_userbyid(p.proowner) <> 'postgres' or not coalesce(p.proconfig @> array['search_path=""'], false))), 'all private helpers owned by postgres with fixed search_path');
select ok(not has_function_privilege('service_role','private.append_audit(text,text,uuid,jsonb)','execute'), 'service role cannot forge audit through helper');
select ok(exists(select 1 from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='private' and p.proname='initialize_profile' and p.proconfig @> array['search_path=""']), 'signup trigger pins search_path');
select ok(exists(select 1 from pg_indexes where schemaname='public' and tablename='staff_memberships' and indexdef like '%(role, active)%'), 'staff role/status lookup indexed');
select * from finish();
rollback;
