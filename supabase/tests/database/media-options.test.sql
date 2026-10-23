begin;
select no_plan();
select has_function('public','list_media_options',array['text','text','timestamp with time zone','uuid'],'bounded ready-by-usage lookup exists');
insert into auth.users(id,email,email_confirmed_at) values
 ('80000000-0000-4000-8000-000000000001','b3-options-admin@example.test',now()),
 ('80000000-0000-4000-8000-000000000002','b3-options-ops@example.test',now());
insert into public.staff_memberships(user_id,role) values ('80000000-0000-4000-8000-000000000001','admin'),('80000000-0000-4000-8000-000000000002','operations');
insert into public.media_assets(id,created_by,file_name,advertised_size,mime,usage_key,original_path,status,created_at)
 values('80000000-0000-4000-8000-000000000010','80000000-0000-4000-8000-000000000001','sql-options-boundary-older-ready.png',1,'image/png','asset_012d3bf8af92d486','options-test/old','ready','2000-01-01');
insert into public.media_assets(created_by,file_name,advertised_size,mime,usage_key,original_path,status,created_at)
 select '80000000-0000-4000-8000-000000000001','sql-options-boundary-attempt-'||n,1,'image/png','asset_012d3bf8af92d486','options-test/attempt-'||n,case when n%2=0 then 'pending' else 'archived' end,now() from generate_series(1,201) n;
insert into public.media_assets(created_by,file_name,advertised_size,mime,usage_key,original_path,status,created_at)
 select '80000000-0000-4000-8000-000000000001','sql-options-boundary-ready-'||n,1,'image/png','asset_012d3bf8af92d486','options-test/ready-'||n,'ready','2030-01-01'::timestamptz from generate_series(1,26) n;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select is(jsonb_array_length(public.get_media_assets()),200,'recent library remains bounded');
select is(jsonb_array_length(public.list_media_options('asset_012d3bf8af92d486','sql-options-boundary-')->'items'),25,'selection page is bounded after status/usage/search filters');
select public.list_media_options('asset_012d3bf8af92d486','sql-options-boundary-')->'nextCursor' as cursor \gset
select is(jsonb_array_length(public.list_media_options('asset_012d3bf8af92d486','sql-options-boundary-',(:'cursor'::jsonb->>'createdAt')::timestamptz,(:'cursor'::jsonb->>'id')::uuid)->'items'),2,'keyset page reaches remaining ready rows despite 201 pending/archived attempts');
select is(public.list_media_options('asset_012d3bf8af92d486','older-ready')->'items'->0->>'id','80000000-0000-4000-8000-000000000010','older ready asset remains searchable');
select is(jsonb_array_length(public.list_media_options('asset_05056f38e42fe55d','sql-options-boundary-')->'items'),0,'another usage cannot retrieve these options');
select is(jsonb_array_length(public.list_media_options('asset_012d3bf8af92d486','sql-options-boundary-attempt')->'items'),0,'pending and archived records cannot enter new selections');
select is((public.list_media_options('asset_012d3bf8af92d486','older-ready')->'items'->0)-'id'-'fileName','{}'::jsonb,'options expose only safe ID and filename');
select throws_ok($$select public.list_media_options('asset_012d3bf8af92d486','',null,'80000000-0000-4000-8000-000000000010')$$,'22023','INVALID_INPUT','partial cursor rejected');
select throws_ok($$select public.list_media_options('unknown')$$,'22023','INVALID_INPUT','unknown usage rejected');
select throws_ok($$select public.list_media_options('asset_012d3bf8af92d486',repeat('x',101))$$,'22023','INVALID_INPUT','search length bounded');
reset role;
select set_config('request.jwt.claims','{"sub":"80000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.list_media_options('asset_012d3bf8af92d486')$$,'42501','FORBIDDEN','operations cannot query options');
reset role;
set local role anon;
select throws_ok($$select public.list_media_options('asset_012d3bf8af92d486')$$,'42501',null,'anonymous cannot query options');
reset role;
select * from finish();
rollback;
