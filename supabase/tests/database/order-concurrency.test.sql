-- Independent current-JWT sessions; lock observations are deterministic barriers, not sleeps pretending to race.
create extension if not exists dblink with schema extensions;
select no_plan();
create table private.c3_saved_offerings as select * from public.catalog_offerings;
create table private.c3_saved_settings as select * from public.commerce_settings;
create table private.c3_saved_publication as select * from public.content_publication;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
 ('b3000000-0000-4000-8000-000000000001','c3-race-admin@example.invalid',now(),false),
 ('b3000000-0000-4000-8000-000000000002','c3-race-member@example.invalid',now(),false),
 ('b3000000-0000-4000-8000-000000000005','c3-race-other-member@example.invalid',now(),false);
insert into public.staff_memberships(user_id,role) values('b3000000-0000-4000-8000-000000000001','admin');
insert into public.content_drafts(id,version,snapshot,created_by,updated_by)
 select 'b3000000-0000-4000-8000-000000000003',1,jsonb_build_object('settings','{}'::jsonb,'messages',jsonb_object_agg(locale,jsonb_build_object('Legal',jsonb_build_object('eyebrow','Legal','draft','Draft','terms',(select jsonb_object_agg(k,'test '||k) from unnest(array['title','intro','p1','h1','p2','h2','p3','h3','p4','h4','p5']) k)),'Products',jsonb_build_object('shipping','Shipping','returns','Returns','warranty','Warranty')))),'b3000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000001' from unnest(array['en','zh-hant','ja']) locale
 on conflict(id) do nothing;
-- Immutable fixture release may remain between runs; never delete audit or release history.
insert into public.content_releases(id,snapshot,draft_id,draft_version,created_by) select 'b3000000-0000-4000-8000-000000000004',snapshot,id,1,created_by from public.content_drafts where id='b3000000-0000-4000-8000-000000000003' on conflict(id) do nothing;
update public.content_publication set release_id='b3000000-0000-4000-8000-000000000004';
update public.catalog_offerings set currency='USD',unit_minor=100,confirmed=true,enabled=true,version=0 where product_id in('ola','tablet');
update public.commerce_settings set orders_enabled=true,approved_terms_release_id='b3000000-0000-4000-8000-000000000004',approved_terms_fingerprint=private.commercial_terms_fingerprint((select snapshot from public.content_releases where id='b3000000-0000-4000-8000-000000000004'));
create temporary table c3_request as select jsonb_build_object('idempotencyKey','race-key-01','items',(select jsonb_agg(jsonb_build_object('skuId',id,'quantity',1) order by id) from public.catalog_offerings where product_id in('ola','tablet')),'shippingAddress','{"name":"Race","country":"US","region":"CA","city":"Test","postalCode":"123","line1":"Test","line2":"","phone":""}'::jsonb,'termsVersion','b3000000-0000-4000-8000-000000000004') as value;
create function pg_temp.await_blocked(pids integer[]) returns boolean language plpgsql as $$
declare deadline timestamptz:=clock_timestamp()+interval '10 seconds';
begin
 loop
  perform pg_stat_clear_snapshot();
  if (select count(*) from pg_stat_activity where pid=any(pids) and wait_event_type='Lock')=cardinality(pids) then return true; end if;
  if clock_timestamp()>deadline then return false; end if;
  perform pg_sleep(0.01);
 end loop;
end;
$$;
select extensions.dblink_connect('c3_a','host=supabase_db_lumiq-platform dbname=postgres user=postgres password=postgres');
select extensions.dblink_connect('c3_b','host=supabase_db_lumiq-platform dbname=postgres user=postgres password=postgres');
create temporary table c3_pids as select 'a' as name,pid from extensions.dblink('c3_a','select pg_backend_pid()') as t(pid integer) union all select 'b',pid from extensions.dblink('c3_b','select pg_backend_pid()') as t(pid integer);
select extensions.dblink_exec('c3_a','set role authenticated');
select extensions.dblink_exec('c3_b','set role authenticated');
select extensions.dblink_exec('c3_a',$$set request.jwt.claims='{"sub":"b3000000-0000-4000-8000-000000000002","role":"authenticated"}'$$);
select extensions.dblink_exec('c3_b',$$set request.jwt.claims='{"sub":"b3000000-0000-4000-8000-000000000002","role":"authenticated"}'$$);
-- Both actual RPCs arrive at the same production key lock before either can insert.
select pg_advisory_lock(hashtextextended('customer-order:b3000000-0000-4000-8000-000000000002:race-key-01',0));
select extensions.dblink_send_query('c3_a',format('select public.create_customer_order(%L::jsonb)',(select value from c3_request)));
select extensions.dblink_send_query('c3_b',format('select public.create_customer_order(%L::jsonb)',(select value from c3_request)));
select ok(pg_temp.await_blocked((select array_agg(pid) from c3_pids)),'both independent requests reached the held production lock');
select pg_advisory_unlock(hashtextextended('customer-order:b3000000-0000-4000-8000-000000000002:race-key-01',0));
create temporary table c3_results(value jsonb);
insert into c3_results select value from extensions.dblink_get_result('c3_a') as t(value jsonb);
insert into c3_results select value from extensions.dblink_get_result('c3_b') as t(value jsonb);
select is((select count(distinct value#>>'{order,id}')::int from c3_results),1,'racing retries share exactly one order');
select is((select count(*)::int from c3_results where value->>'reused'='true'),1,'exactly one duplicate is reused');
select is((select count(*)::int from public.customer_orders where user_id='b3000000-0000-4000-8000-000000000002'),1,'no duplicate persisted');
select is((select count(*)::int from public.audit_events where action='orders.created' and entity_id=(select (value#>>'{order,id}')::uuid from c3_results limit 1)),1,'race writes exactly one creation audit');
-- Drain async command end markers before issuing more work.
select * from extensions.dblink_get_result('c3_a') as t(value jsonb);
select * from extensions.dblink_get_result('c3_b') as t(value jsonb);
-- Admin updates two prices atomically; customer is already waiting after first write.
select extensions.dblink_exec('c3_a',$$set request.jwt.claims='{"sub":"b3000000-0000-4000-8000-000000000001","role":"authenticated"}'$$);
select extensions.dblink_exec('c3_a','begin');
select * from extensions.dblink('c3_a',format('select public.set_catalog_offering(%L,%L,200,true,true,0)',(select id from public.catalog_offerings where product_id='ola'),'USD')) as t(value text);
select extensions.dblink_send_query('c3_b',format('select public.create_customer_order(%L::jsonb)',(select jsonb_set(value,'{idempotencyKey}','"race-price-02"') from c3_request)));
select ok(pg_temp.await_blocked(array[(select pid from c3_pids where name='b')]),'customer actually blocks on first price while admin transaction remains open');
select * from extensions.dblink('c3_a',format('select public.set_catalog_offering(%L,%L,300,true,true,0)',(select id from public.catalog_offerings where product_id='tablet'),'USD')) as t(value text);
select extensions.dblink_exec('c3_a','commit');
create temporary table c3_price_result as select value from extensions.dblink_get_result('c3_b') as t(value jsonb);
select is((select value#>>'{order,totals,itemsMinor}' from c3_price_result),'500','all items use committed consistent new prices, never 300 or 400 mixed snapshot');
select is((select string_agg((i->>'unitMinor'),',' order by (i->>'unitMinor')::int) from c3_price_result,jsonb_array_elements(value#>'{order,items}') i),'200,300','both immutable line prices match transaction');
select * from extensions.dblink_get_result('c3_b') as t(value jsonb);
-- Cancellation holds the same key lock through commit; a real retry waits then sees cancelled.
select extensions.dblink_exec('c3_a',$$set request.jwt.claims='{"sub":"b3000000-0000-4000-8000-000000000002","role":"authenticated"}'$$);
select extensions.dblink_exec('c3_a','begin');
select * from extensions.dblink('c3_a',format('select public.cancel_customer_order(%L)',(select value#>>'{order,id}' from c3_results limit 1))) as t(value jsonb);
select extensions.dblink_send_query('c3_b',format('select public.create_customer_order(%L::jsonb)',(select value from c3_request)));
select ok(pg_temp.await_blocked(array[(select pid from c3_pids where name='b')]),'retry reaches lock while cancellation is uncommitted');
select extensions.dblink_exec('c3_a','commit');
create temporary table c3_cancel_result as select value from extensions.dblink_get_result('c3_b') as t(value jsonb);
select is((select value#>>'{order,status}' from c3_cancel_result),'cancelled','racing retry sees cancelled and never reopens');
select is((select value->>'reused' from c3_cancel_result),'true','cancel race still reports reused');
select is((select count(*)::int from public.customer_orders where user_id='b3000000-0000-4000-8000-000000000002'),2,'only the two intentional unique requests exist');
select * from extensions.dblink_get_result('c3_b') as t(value jsonb);
-- The same customer's new keys serialize on the quota counter, preventing quota overruns.
select extensions.dblink_exec('c3_a','begin');
select * from extensions.dblink('c3_a',format('select public.create_customer_order(%L::jsonb)',(select jsonb_set(value,'{idempotencyKey}','"parallel-new-a"') from c3_request))) as t(value jsonb);
select extensions.dblink_send_query('c3_b',format('select public.create_customer_order(%L::jsonb)',(select jsonb_set(value,'{idempotencyKey}','"parallel-new-b"') from c3_request)));
create function pg_temp.await_finished(connection text) returns boolean language plpgsql as $$
declare deadline timestamptz:=clock_timestamp()+interval '5 seconds';begin
 while extensions.dblink_is_busy(connection)=1 loop
  if clock_timestamp()>deadline then return false; end if; perform pg_sleep(0.01);
 end loop;return true;end;$$;
select ok(pg_temp.await_blocked(array[(select pid from c3_pids where name='b')]),'same-customer different-key order waits for the quota transaction');
select extensions.dblink_exec('c3_a','commit');
select * from extensions.dblink_get_result('c3_b') as t(value jsonb);
select is((select count(*)::int from public.customer_orders where user_id='b3000000-0000-4000-8000-000000000002'),4,'different-key concurrent requests create exactly two additional orders');
select * from extensions.dblink_get_result('c3_b') as t(value jsonb);
-- Separate customers retain concurrent shared pricing locks and independent quotas.
select extensions.dblink_exec('c3_b',$$set request.jwt.claims='{"sub":"b3000000-0000-4000-8000-000000000005","role":"authenticated"}'$$);
select extensions.dblink_exec('c3_a','begin');
select * from extensions.dblink('c3_a',format('select public.create_customer_order(%L::jsonb)',(select jsonb_set(value,'{idempotencyKey}','"parallel-new-c"') from c3_request))) as t(value jsonb);
select extensions.dblink_send_query('c3_b',format('select public.create_customer_order(%L::jsonb)',(select jsonb_set(value,'{idempotencyKey}','"parallel-other-customer"') from c3_request)));
select ok(pg_temp.await_finished('c3_b'),'different customer completes while first customer transaction remains open');
select extensions.dblink_exec('c3_a','commit');
select * from extensions.dblink_get_result('c3_b') as t(value jsonb);
select is((select count(*)::int from public.customer_orders where user_id='b3000000-0000-4000-8000-000000000005'),1,'other customer persists exactly one order');
select extensions.dblink_disconnect('c3_a');
select extensions.dblink_disconnect('c3_b');
-- Restore every prior commercial value; keep immutable audit/release fixtures, remove own private rows.
update public.catalog_offerings c set currency=s.currency,unit_minor=s.unit_minor,confirmed=s.confirmed,enabled=s.enabled,version=s.version from private.c3_saved_offerings s where c.id=s.id;
update public.commerce_settings c set orders_enabled=s.orders_enabled,approved_terms_release_id=s.approved_terms_release_id,approved_terms_fingerprint=s.approved_terms_fingerprint,version=s.version from private.c3_saved_settings s where c.singleton=s.singleton;
update public.content_publication c set release_id=s.release_id,updated_at=s.updated_at from private.c3_saved_publication s where c.singleton=s.singleton;
delete from public.order_items where order_id in(select id from public.customer_orders where user_id in('b3000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000005'));
delete from public.customer_orders where user_id in('b3000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000005');
delete from auth.users where id in('b3000000-0000-4000-8000-000000000001','b3000000-0000-4000-8000-000000000002','b3000000-0000-4000-8000-000000000005');
drop table private.c3_saved_offerings,private.c3_saved_settings,private.c3_saved_publication;
select * from finish();
