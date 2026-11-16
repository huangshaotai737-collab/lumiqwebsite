begin;
select no_plan();
insert into auth.users(id,email,created_at,is_anonymous) values
 ('a1000000-0000-4000-8000-000000000001','c2-admin@example.invalid','2026-01-01',false),
 ('a1000000-0000-4000-8000-000000000002','c2-operations@example.invalid','2026-01-01',false),
 ('a1000000-0000-4000-8000-000000000003','c2-editor@example.invalid','2026-01-01',false),
 ('a1000000-0000-4000-8000-000000000004','c2-customer-a@example.invalid','2026-02-02',false),
 ('a1000000-0000-4000-8000-000000000005','c2-customer-b@example.invalid','2026-02-02',false),
 ('a1000000-0000-4000-8000-000000000006','c2-anonymized@example.invalid','2026-02-02',false),
 ('a1000000-0000-4000-8000-000000000007','c2-inactive-staff@example.invalid','2026-02-02',false);
insert into public.staff_memberships(user_id,role,active) values
 ('a1000000-0000-4000-8000-000000000001','admin',true),('a1000000-0000-4000-8000-000000000002','operations',true),('a1000000-0000-4000-8000-000000000003','editor',true),('a1000000-0000-4000-8000-000000000007','operations',false);
update public.profiles set access_state='anonymized' where user_id='a1000000-0000-4000-8000-000000000006';
insert into public.waitlist_signups(id,email,source,consent_version,created_at) values
 ('a2000000-0000-4000-8000-000000000001','c2-wait-a@example.invalid','prelaunch','waitlist-v1','2026-01-01'),
 ('a2000000-0000-4000-8000-000000000002','c2-wait-b@example.invalid','prelaunch','waitlist-v1','2026-01-01');
select has_function('public','list_customer_operations',array['text','integer','integer'],'restricted customer operations RPC exists');
set local role anon;
select throws_ok($$select public.list_customer_operations('',1,25)$$,'42501',null,'anonymous cannot query customer email');
select throws_ok($$select public.list_waitlist_operations('', 'all',1,25)$$,'42501',null,'anonymous cannot query waitlist email');
set local role authenticated;
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000004","role":"authenticated"}';
select throws_ok($$select public.list_customer_operations('',1,25)$$,'42501',null,'member cannot query customer email');
select throws_ok($$select * from public.customer_notes$$,'42501',null,'member cannot read internal notes');
select throws_ok($$select * from public.waitlist_operations$$,'42501',null,'member cannot read operations table');
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000003","role":"authenticated"}';
select throws_ok($$select public.export_waitlist_operations('','all')$$,'42501',null,'editor_cannot_export_waitlist');
select throws_ok($$select public.list_customer_operations('',1,25)$$,'42501',null,'editor cannot list customers');
select throws_ok($$select public.update_waitlist_operations('a2000000-0000-4000-8000-000000000001','closed','',0)$$,'42501',null,'editor cannot update operations');
select throws_ok($$select public.add_customer_note('a1000000-0000-4000-8000-000000000004','note')$$,'42501',null,'editor cannot add customer notes');
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select is(public.list_customer_operations('c2-customer',1,25)->>'total','2','customer fixture count isolated from historical users');
select is(public.list_customer_operations('c2-inactive-staff',1,25)->>'total','0','inactive staff excluded from customer list');
select is(public.list_customer_operations('c2-anonymized',1,25)->>'total','0','anonymized excluded from customer list');
select is(public.list_customer_operations('c2-customer',1,1)#>>'{items,0,id}','a1000000-0000-4000-8000-000000000005','customer stable id desc tie ordering');
select is(public.list_customer_operations('c2-customer',2,1)#>>'{items,0,id}','a1000000-0000-4000-8000-000000000004','second page is distinct');
select is(public.list_customer_operations('c2-customer',9,1)->>'total','2','out-of-range page retains exact total');
select is(jsonb_array_length(public.list_customer_operations('c2-customer',9,1)->'items'),0,'out-of-range page has no rows');
select is(public.list_customer_operations('%',1,25)->>'total','0','search wildcard is a literal substring');
select throws_ok($$select public.list_customer_operations('',0,25)$$,'22023',null,'invalid page rejected in SQL');
select throws_ok($$select public.list_customer_operations('',1,101)$$,'22023',null,'direct RPC page cap enforced');
select lives_ok($$select public.add_customer_note('a1000000-0000-4000-8000-000000000004','internal only')$$,'operations adds real customer note');
select is(public.list_customer_notes('a1000000-0000-4000-8000-000000000004')#>>'{0,note}','internal only','restricted note read persists');
select throws_ok($$select public.add_customer_note('a1000000-0000-4000-8000-000000000007','staff note')$$,'P0002',null,'inactive staff target excluded by ID');
select throws_ok($$select public.list_customer_notes('a1000000-0000-4000-8000-000000000006')$$,'P0002',null,'anonymized target detail excluded by ID');
select throws_ok($$select public.add_customer_note('a1000000-0000-4000-8000-000000000004',repeat('x',2001))$$,'22023',null,'note max 2000 enforced');
select is(public.list_waitlist_operations('c2-wait','new',1,25)->>'total','2','new rows visible before any operation metadata');
select is(public.list_waitlist_operations('c2-wait','all',1,1)#>>'{items,0,id}','a2000000-0000-4000-8000-000000000002','waitlist stable id order');
select is(public.list_waitlist_operations('c2-wait','all',2,1)#>>'{items,0,id}','a2000000-0000-4000-8000-000000000001','waitlist second page');
select lives_ok($$select public.update_waitlist_operations('a2000000-0000-4000-8000-000000000001','contacted','=1+1',0)$$,'status and note persist transactionally');
select is(public.list_waitlist_operations('c2-wait','contacted',1,25)#>>'{items,0,version}','1','version incremented');
select is(public.list_waitlist_operations('c2-wait','contacted',1,25)#>>'{items,0,note}','=1+1','raw note preserved in DB for CSV boundary escaping');
select throws_ok($$select public.update_waitlist_operations('a2000000-0000-4000-8000-000000000001','closed','stale',0)$$,'23505',null,'stale expected version conflicts');
select is(public.list_waitlist_operations('c2-wait','contacted',1,25)#>>'{items,0,note}','=1+1','stale save does not overwrite');
select is(jsonb_array_length(public.export_waitlist_operations('c2-wait','contacted')),1,'export respects full filter');
reset role;
select is((select email from public.waitlist_signups where id='a2000000-0000-4000-8000-000000000001'),'c2-wait-a@example.invalid','original email unchanged');
select is((select consent_version from public.waitlist_signups where id='a2000000-0000-4000-8000-000000000001'),'waitlist-v1','original consent unchanged');
select ok(exists(select 1 from public.audit_events where actor_id='a1000000-0000-4000-8000-000000000002' and action='waitlist.exported' and summary @> '{"rowCount":1,"hasSearch":true,"status":"contacted","maxRows":10000}'),'export range audited');
select ok(not exists(select 1 from public.audit_events where actor_id='a1000000-0000-4000-8000-000000000002' and summary::text like '%c2-wait%'),'audit contains no raw email/search');
create function pg_temp.fail_operations_audit() returns trigger language plpgsql as $$begin if new.action in ('waitlist.updated','waitlist.exported','customers.note_added') then raise exception 'audit unavailable'; end if; return new; end;$$;
create trigger c2_audit_failure before insert on public.audit_events for each row execute function pg_temp.fail_operations_audit();
set local role authenticated;
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select throws_ok($$select public.export_waitlist_operations('c2-wait','all')$$,'P0001','audit unavailable','no audit means no export');
select throws_ok($$select public.update_waitlist_operations('a2000000-0000-4000-8000-000000000001','closed','lost',1)$$,'P0001','audit unavailable','no audit means failed save');
select is(public.list_waitlist_operations('c2-wait','contacted',1,25)#>>'{items,0,version}','1','audit failure rolls back version and update');
select throws_ok($$select public.add_customer_note('a1000000-0000-4000-8000-000000000004','lost')$$,'P0001','audit unavailable','no audit means failed customer note');
select is(jsonb_array_length(public.list_customer_notes('a1000000-0000-4000-8000-000000000004')),1,'failed customer note rolled back');
reset role;
drop trigger c2_audit_failure on public.audit_events;
set local role authenticated;
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000002","role":"authenticated"}';
select public.export_waitlist_operations('c2-wait','all');
select public.export_waitlist_operations('c2-wait','all');
select public.export_waitlist_operations('c2-wait','all');
select lives_ok($$select public.export_waitlist_operations('c2-wait','all')$$,'fifth staff export allowed');
select throws_ok($$select public.export_waitlist_operations('c2-wait','all')$$,'P0003',null,'sixth staff export refused');
reset role;
update public.staff_memberships set active=false where user_id='a1000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($$select public.list_waitlist_operations('c2-wait','all',1,25)$$,'42501',null,'same JWT fails immediately after staff disable');
set local request.jwt.claims='{"sub":"a1000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public.list_waitlist_operations('c2-wait','all',1,25)->>'total','2','admin can read operational records');
reset role;
insert into public.waitlist_signups(email,source,consent_version) select 'c2-overflow-'||g||'@example.invalid','prelaunch','waitlist-v1' from generate_series(1,10001)g;
set local role authenticated;
select throws_ok($$select public.export_waitlist_operations('c2-overflow-','all')$$,'22023',null,'overflow rejected rather than silently truncated');
reset role;
set local role service_role;
select r.allowed from generate_series(1,4)g cross join lateral public.consume_request_limit('waitlist',repeat('a',64)||left(g::text,0)) r;
select ok((select allowed from public.consume_request_limit('waitlist',repeat('a',64))),'fifth waitlist signup attempt allowed');
select ok(not(select allowed from public.consume_request_limit('waitlist',repeat('a',64))),'sixth waitlist signup attempt rejected');
select ok((select retry_after_seconds between 890 and 900 from public.consume_request_limit('waitlist',repeat('a',64))),'signup fixed15minute policy');
select * from finish();
rollback;
