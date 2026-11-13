-- Only unique fixtures and transaction-scoped configuration; all changes roll back.
begin;
select no_plan();
\ir ../support/content-fixture.inc
create temporary table audit_fixture as select gen_random_uuid() a, gen_random_uuid() b,gen_random_uuid() admin_id,gen_random_uuid() bad_draft,gen_random_uuid() baseline_draft,gen_random_uuid() release_id,pg_temp.content_boundary_snapshot() snapshot;
grant select on audit_fixture to authenticated;
select diag('owned IDs before writes: '||row_to_json(f)::text) from (select a,b,admin_id,bad_draft from audit_fixture) f;
insert into auth.users(id,email,email_confirmed_at,is_anonymous) select id,'audit-'||id||'@example.invalid',now(),false from audit_fixture cross join lateral unnest(array[a,b,admin_id]) id;
insert into public.staff_memberships(user_id,role) select admin_id,'admin' from audit_fixture;
insert into public.content_drafts(id,version,snapshot,created_by,updated_by) select baseline_draft,1,snapshot,admin_id,admin_id from audit_fixture;
insert into public.content_releases(id,snapshot,draft_id,draft_version,created_by) select release_id,snapshot,baseline_draft,1,admin_id from audit_fixture;
update public.content_publication set release_id=f.release_id from audit_fixture f where singleton;
select lives_ok($$select private.assert_media_selection(snapshot,snapshot) from audit_fixture$$,'initial product aliases remain compatible');
select throws_ok($$select private.assert_media_selection(jsonb_set(snapshot,'{products,ola,image}','"/api/media/12345678-1234-4123-8123-123456789abc"'),snapshot) from audit_fixture$$,'22023','INVALID_MEDIA','selection rejects product reference outside canonical slots');
select throws_ok($$select private.assert_media_snapshot(jsonb_set(snapshot,'{products,ola,image}','"/api/media/12345678-1234-4123-8123-123456789abc"')) from audit_fixture$$,'22023','INVALID_MEDIA','publication rejects untracked product reference');
select set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true) from audit_fixture;
set local role authenticated;
select throws_ok($$select public.save_content_draft(bad_draft,0,jsonb_set(snapshot,'{products,ola,image}','"/api/media/12345678-1234-4123-8123-123456789abc"')) from audit_fixture$$,'22023','INVALID_MEDIA','actual save RPC rejects untracked product image');
reset role;
-- Enable only inside this rolled-back transaction. Other readers retain committed closed settings.
update public.catalog_offerings set currency='USD',unit_minor=100,confirmed=true,enabled=true where product_id='ola';
update public.commerce_settings set orders_enabled=true,approved_terms_release_id=f.release_id,approved_terms_fingerprint=private.commercial_terms_fingerprint(f.snapshot) from audit_fixture f where singleton;
create function pg_temp.audit_order_request(key text) returns jsonb language sql security definer set search_path='' as $$select jsonb_build_object('idempotencyKey',key,'items',jsonb_build_array(jsonb_build_object('skuId',(select id from public.catalog_offerings where product_id='ola'),'quantity',1)),'shippingAddress','{"name":"Audit","country":"TW","region":"","city":"Taipei","postalCode":"100","line1":"Synthetic","line2":"","phone":""}'::jsonb,'termsVersion',release_id) from pg_temp.audit_fixture$$;
select set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true) from audit_fixture;
set local role authenticated;
select lives_ok($sql$do $body$begin for i in 1..60 loop perform public.create_customer_order(pg_temp.audit_order_request('audit-quota-'||lpad(i::text,3,'0')));end loop;end$body$;$sql$,'direct authenticated RPC permits first60 creations');
select throws_ok($$select public.create_customer_order(pg_temp.audit_order_request('audit-quota-061'))$$,'P0005',null,'direct authenticated RPC cannot bypass new-order quota');
select is(public.create_customer_order(pg_temp.audit_order_request('audit-quota-001'))->>'reused','true','same-key recovery still succeeds at quota');
select throws_ok($$select public.create_customer_order(jsonb_set(pg_temp.audit_order_request('audit-quota-001'),'{items,0,quantity}','2'))$$,'23505',null,'same-key changed payload still conflicts at quota');
select throws_ok($$select public.create_customer_order(jsonb_set(pg_temp.audit_order_request('audit-bad-terms'),'{termsVersion}',to_jsonb(gen_random_uuid()::text)))$$,'23505','terms changed','canonical uncommitted terms error precedes quota');
select is((public.list_customer_orders(1,100)->>'total')::int,60,'quota rejection creates no extra persistent order');
select set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true) from audit_fixture;
select lives_ok($$select public.create_customer_order(pg_temp.audit_order_request('audit-quota-001'))$$,'different verified customer has independent quota');
reset role;
select * from finish();
rollback;
