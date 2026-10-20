begin;
select plan(9);

insert into public.waitlist_signups(id,email,source,consent_version,created_at)
values ('20000000-0000-0000-0000-000000000002','upgrade-test@example.invalid','prelaunch','waitlist-v1','2026-02-03T04:05:06Z');
select is((select id from public.waitlist_signups where email='upgrade-test@example.invalid'), '20000000-0000-0000-0000-000000000002'::uuid, 'preserve_existing_waitlist: id is retained');
select is((select email from public.waitlist_signups where id='20000000-0000-0000-0000-000000000002'), 'upgrade-test@example.invalid', 'email is retained');
select is((select created_at from public.waitlist_signups where id='20000000-0000-0000-0000-000000000002'), '2026-02-03T04:05:06Z'::timestamptz, 'original creation time is retained');
select col_is_pk('public','waitlist_signups','id','original primary key remains');
select col_is_unique('public','waitlist_signups','email','email deduplication remains');
select throws_ok($$insert into public.waitlist_signups(email) values ('upgrade-test@example.invalid')$$, '23505', 'duplicate key value violates unique constraint "waitlist_signups_email_key"', 'duplicate email is still rejected');
select throws_ok($$insert into public.waitlist_signups(email) values ('MixedCase@example.invalid')$$, '23514', 'new row for relation "waitlist_signups" violates check constraint "waitlist_email_normalized"', 'normalization constraint is preserved');
set local role anon;
select throws_ok('select * from public.waitlist_signups', '42501', 'permission denied for table waitlist_signups', 'waitlist remains unreadable to anonymous');
reset role;
set local role service_role;
select lives_ok($$insert into public.waitlist_signups(email) values ('server-only@example.invalid')$$, 'original server-only insertion remains available');
reset role;
select * from finish();
rollback;
