-- Run with pg_prove / supabase test db after the media-library migration.
-- Dedicated synthetic IDs and paths; every fixture rolls back. Never reset/reseed.
begin;
select no_plan();
select has_function('public','list_media_library',array['text','text','text','text','integer'],'whole-library authorized read exists');
insert into auth.users(id,email,email_confirmed_at) values
 ('abed1700-0000-4000-8000-000000000001','audit-media-admin@example.test',now()),
 ('abed1700-0000-4000-8000-000000000002','audit-media-editor@example.test',now()),
 ('abed1700-0000-4000-8000-000000000003','audit-media-ops@example.test',now()),
 ('abed1700-0000-4000-8000-000000000004','audit-media-member@example.test',now()),
 ('abed1700-0000-4000-8000-000000000005','audit-media-disabled@example.test',now());
insert into public.staff_memberships(user_id,role,active) values
 ('abed1700-0000-4000-8000-000000000001','admin',true),
 ('abed1700-0000-4000-8000-000000000002','editor',true),
 ('abed1700-0000-4000-8000-000000000003','operations',true),
 ('abed1700-0000-4000-8000-000000000005','editor',false);
insert into public.media_assets(id,created_by,file_name,advertised_size,mime,usage_key,original_path,status,created_at)
values ('abed1700-0000-4000-8000-000000000010','abed1700-0000-4000-8000-000000000001','audit-media-lookup-older_100%.png',1,'image/png','asset_012d3bf8af92d486','audit-media-lookup/older','archived','2000-01-01');
insert into public.media_assets(created_by,file_name,advertised_size,mime,usage_key,original_path,status,created_at)
select 'abed1700-0000-4000-8000-000000000001','audit-media-lookup-recent-'||n,1,'image/png','asset_05056f38e42fe55d','audit-media-lookup/recent-'||n,case when n%2=0 then 'pending' else 'ready' end,'2030-01-01' from generate_series(1,201) n;
insert into public.content_drafts(id,version,snapshot,status,created_by,updated_by,updated_at)
select ('abed1700-0000-4000-8000-'||lpad((100+n)::text,12,'0'))::uuid,n,
 jsonb_build_object('settings','{}'::jsonb,'media',jsonb_build_object('asset_012d3bf8af92d486',jsonb_build_object('assetId','abed1700-0000-4000-8000-000000000010'))),
 'editing','abed1700-0000-4000-8000-000000000001','abed1700-0000-4000-8000-000000000001','2030-01-01'::timestamptz+n*interval '1 minute' from generate_series(1,6) n;
insert into public.content_releases(id,snapshot,draft_id,draft_version,created_by,created_at)
select ('abed1700-0000-4000-8000-'||lpad((200+n)::text,12,'0'))::uuid,
 jsonb_build_object('media',jsonb_build_object('asset_012d3bf8af92d486',jsonb_build_object('assetId','abed1700-0000-4000-8000-000000000010'))),
 'abed1700-0000-4000-8000-000000000101',n,'abed1700-0000-4000-8000-000000000001','2030-01-01'::timestamptz+n*interval '1 minute' from generate_series(1,7) n;
insert into private.media_release_assets(release_id,asset_id,usage_key)
select ('abed1700-0000-4000-8000-'||lpad((200+n)::text,12,'0'))::uuid,'abed1700-0000-4000-8000-000000000010','asset_012d3bf8af92d486' from generate_series(1,7) n;
update public.content_publication set release_id='abed1700-0000-4000-8000-000000000201' where singleton;
select set_config('request.jwt.claims','{"sub":"abed1700-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select is((public.list_media_library('audit-media-lookup-')->>'total')::integer,202,'exact total includes assets older than recent 200');
select is(jsonb_array_length(public.list_media_library('audit-media-lookup-')->'items'),25,'first page bounded to 25');
select is(jsonb_array_length(public.list_media_library('audit-media-lookup-',null,null,null,9)->'items'),2,'last page reaches older asset');
select is(public.list_media_library('audit-media-lookup-',null,null,null,9)->'items'->1->>'id','abed1700-0000-4000-8000-000000000010','stable ordering reaches old archived row');
select is((public.list_media_library('100%')->>'total')::integer,1,'percent search is literal');
select is((public.list_media_library('older_100')->>'total')::integer,1,'underscore search is literal');
select is(public.list_media_library('abed1700-0000-4000-8000-000000000010')->'items'->0->>'fileName','audit-media-lookup-older_100%.png','whole UUID search finds old asset');
select is((public.list_media_library('audit-media-lookup-','asset_012d3bf8af92d486')->>'total')::integer,1,'usage filter applies before paging');
select is((public.list_media_library('audit-media-lookup-',null,'pending')->>'total')::integer,100,'status filter applies before paging');
select is((public.list_media_library('audit-media-lookup-',null,null,'unreferenced')->>'total')::integer,201,'upload usage is not an actual reference');
select is((public.list_media_library('audit-media-lookup-',null,null,'draft')->>'total')::integer,1,'draft reference filter finds actual current snapshots');
select is((public.list_media_library('audit-media-lookup-',null,null,'published')->>'total')::integer,1,'current publication reference filter');
select is((public.list_media_library('audit-media-lookup-',null,null,'history')->>'total')::integer,1,'historical reference filter independent of current');
select public.list_media_library('older_100')->'items'->0 as asset \gset
select is((:'asset'::jsonb->'references'->>'draftCount')::integer,6,'draft reference count is exact');
select is((:'asset'::jsonb->'references'->>'releaseCount')::integer,7,'immutable release reference count is exact');
select is((:'asset'::jsonb->'references'->>'currentPublication')::boolean,true,'current publication flag uses actual reference');
select is(jsonb_array_length(:'asset'::jsonb->'references'->'drafts'),5,'draft detail list is bounded');
select is(jsonb_array_length(:'asset'::jsonb->'references'->'releases'),5,'release detail list is bounded');
select is((:'asset'::jsonb->'references'->>'draftsTruncated')::boolean,true,'draft truncation disclosed');
select is((:'asset'::jsonb->'references'->>'releasesTruncated')::boolean,true,'release truncation disclosed');
select is(:'asset'::jsonb->'references'->'releases'->0->>'id','abed1700-0000-4000-8000-000000000201','current publication appears even when older than recent five');
select is(:'asset'::jsonb-'id'-'fileName'-'usageKey'-'mime'-'size'-'status'-'references','{}'::jsonb,'no storage paths, actor identity or content snapshots leaked');
select is((public.list_media_library('audit-media-lookup-no-such-file')->>'total')::integer,0,'empty search total is truthful');
select is(jsonb_array_length(public.list_media_library('audit-media-lookup-no-such-file')->'items'),0,'empty search items are empty');
select is((public.list_media_library('audit-media-lookup-',null,null,null,10)->>'total')::integer,202,'out of range page preserves total');
select is(jsonb_array_length(public.list_media_library('audit-media-lookup-',null,null,null,10)->'items'),0,'out of range page is empty');
select throws_ok($$select public.list_media_library('',null,null,null,0)$$,'22023','INVALID_INPUT','zero page rejected');
select throws_ok($$select public.list_media_library(repeat('x',101))$$,'22023','INVALID_INPUT','search bounded');
select throws_ok($$select public.list_media_library('','unknown')$$,'22023','INVALID_INPUT','unknown usage rejected');
select throws_ok($$select public.list_media_library('',null,'deleted')$$,'22023','INVALID_INPUT','unknown status rejected');
select throws_ok($$select public.list_media_library('',null,null,'secret')$$,'22023','INVALID_INPUT','unknown reference filter rejected');
select throws_ok($$select * from private.media_release_assets$$,'42501',null,'private references stay inaccessible');
reset role;
select set_config('request.jwt.claims','{"sub":"abed1700-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select is((public.list_media_library('older_100')->'items'->0->'references'->>'releaseCount')::integer,7,'editor gets narrow immutable references');
select throws_ok($$select public.get_content_release('abed1700-0000-4000-8000-000000000201')$$,'42501','FORBIDDEN','editor reference read does not open full release snapshots');
reset role;
select set_config('request.jwt.claims','{"sub":"abed1700-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.list_media_library()$$,'42501','FORBIDDEN','operations denied');
reset role;
select set_config('request.jwt.claims','{"sub":"abed1700-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.list_media_library()$$,'42501','FORBIDDEN','ordinary member denied');
reset role;
select set_config('request.jwt.claims','{"sub":"abed1700-0000-4000-8000-000000000005","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.list_media_library()$$,'42501','FORBIDDEN','disabled editor denied despite claims');
reset role;
set local role anon;
select throws_ok($$select public.list_media_library()$$,'42501',null,'anonymous denied function grant');
reset role;
set local role service_role;
select throws_ok($$select public.list_media_library()$$,'42501',null,'service credential cannot bypass authenticated staff lookup');
reset role;
select * from finish();
rollback;
