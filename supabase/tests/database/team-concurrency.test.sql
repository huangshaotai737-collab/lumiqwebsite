-- Real independent PostgreSQL sessions race two self-demotions. Fixtures are synthetic.
create extension if not exists dblink with schema extensions;
drop function if exists private.a4_concurrent_demote(uuid);
delete from auth.users where id in ('44000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000002');
select plan(4);
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('44000000-0000-4000-8000-000000000001','race-admin1@example.test',now(),false),
 ('44000000-0000-4000-8000-000000000002','race-admin2@example.test',now(),false);
insert into public.staff_memberships(user_id,role) values
 ('44000000-0000-4000-8000-000000000001','admin'),('44000000-0000-4000-8000-000000000002','admin');
create function private.a4_concurrent_demote(actor uuid) returns text language plpgsql set search_path='' as $$
begin
 perform set_config('request.jwt.claims',json_build_object('sub',actor,'role','authenticated')::text,true);
 perform public.change_staff_membership(actor,'editor',true);
 return 'demoted';
exception when unique_violation or insufficient_privilege then return SQLERRM;
end$$;
revoke all on function private.a4_concurrent_demote(uuid) from public,anon,authenticated,service_role;
select extensions.dblink_connect('a4_race1','host=supabase_db_lumiq-platform dbname=postgres user=postgres password=postgres');
select extensions.dblink_connect('a4_race2','host=supabase_db_lumiq-platform dbname=postgres user=postgres password=postgres');
select pg_advisory_lock(7410404);
select extensions.dblink_send_query('a4_race1',$$select private.a4_concurrent_demote('44000000-0000-4000-8000-000000000001')$$);
select extensions.dblink_send_query('a4_race2',$$select private.a4_concurrent_demote('44000000-0000-4000-8000-000000000002')$$);
do $$declare deadline timestamptz:=clock_timestamp()+interval '10 seconds'; begin
 loop
  exit when (select count(*) from pg_locks where locktype='advisory' and objid=7410404 and not granted)=2;
  if clock_timestamp()>deadline then raise exception 'both sessions did not reach the lock'; end if;
  perform pg_sleep(0.02);
 end loop;
end$$;
select is((select count(*)::int from pg_locks where locktype='advisory' and objid=7410404 and not granted),2,'both independent sessions overlap at authorization lock');
select pg_advisory_unlock(7410404);
create temporary table a4_race_outcomes(result text);
insert into a4_race_outcomes select result from extensions.dblink_get_result('a4_race1') as t(result text);
insert into a4_race_outcomes select result from extensions.dblink_get_result('a4_race2') as t(result text);
select is((select count(*)::integer from public.staff_memberships where role='admin' and active), 1, 'one admin survives');
select is((select count(*)::int from a4_race_outcomes where result='demoted'),1,'exactly one concurrent demotion succeeds');
select is((select count(*)::int from a4_race_outcomes where result='LAST_ADMIN'),1,'second serialized transaction rejects last admin demotion');
select extensions.dblink_disconnect('a4_race1');select extensions.dblink_disconnect('a4_race2');
drop function private.a4_concurrent_demote(uuid);
delete from auth.users where id in ('44000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000002');
-- Trusted local test fixture cleanup only; API users still have no mutation grants.
alter table public.audit_events disable trigger audit_events_no_update_delete;
delete from public.audit_events where actor_id in ('44000000-0000-4000-8000-000000000001','44000000-0000-4000-8000-000000000002');
alter table public.audit_events enable trigger audit_events_no_update_delete;
select * from finish();
