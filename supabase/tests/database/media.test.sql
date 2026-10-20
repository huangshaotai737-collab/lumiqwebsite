begin;
select no_plan();
select has_table('public','media_assets','private media inventory exists');
select has_function('public','get_public_asset',array['uuid'],'released-reference proof exists');
select is((select public from storage.buckets where id='media-originals'),false,'original bucket stays private');
select is((select public from storage.buckets where id='media-releases'),false,'immutable copy bucket stays private');
insert into auth.users(id,email,email_confirmed_at) values
 ('70000000-0000-4000-8000-000000000001','b3-admin@example.test',now()),
 ('70000000-0000-4000-8000-000000000002','b3-editor@example.test',now()),
 ('70000000-0000-4000-8000-000000000003','b3-ops@example.test',now());
insert into public.staff_memberships(user_id,role) values
 ('70000000-0000-4000-8000-000000000001','admin'),('70000000-0000-4000-8000-000000000002','editor'),('70000000-0000-4000-8000-000000000003','operations');
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.create_media_upload('synthetic.png',4,'image/png','asset_012d3bf8af92d486')->>'assetId' as asset_id \gset
select is(public.get_public_asset(:'asset_id'),null::jsonb,'pending upload has no public proof');
select throws_ok($$select public.create_media_upload('x.png',0,'image/png','asset_012d3bf8af92d486')$$,'22023','INVALID_INPUT','empty rejected');
select throws_ok($$select public.create_media_upload('x.png',20971521,'image/png','asset_012d3bf8af92d486')$$,'22023','INVALID_INPUT','oversize rejected');
select throws_ok($$select public.create_media_upload('x.mov',4,'video/quicktime','asset_6f36183e6da5cc73')$$,'22023','INVALID_INPUT','transparent legacy group is read only');
select throws_ok($$select * from public.media_assets$$,'42501',null,'browser cannot edit trusted metadata');
reset role;
insert into storage.objects(bucket_id,name,metadata) select 'media-originals',original_path,'{"size":4}' from public.media_assets where id=:'asset_id';
select public.complete_media_asset(:'asset_id','70000000-0000-4000-8000-000000000001','{"size":4,"mime":"image/png","width":10,"height":10,"duration":null,"codec":"png","alpha":false,"sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}');
select throws_ok(format('select public.mark_media_copy(%L,%L)',:'asset_id','70000000-0000-4000-8000-000000000002'),'42501','FORBIDDEN','editor cannot mark a release copy');
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.save_content_draft('70000000-0000-4000-8000-000000000010',0,jsonb_build_object('settings','{}'::jsonb,'media',jsonb_build_object('asset_012d3bf8af92d486',jsonb_build_object('assetId',:'asset_id','url','/api/media/'||:'asset_id','kind','image','profile','public-content'))));
reset role;
select public.attest_content_snapshot('draft',id,version,snapshot,'b1-v1-22cec87','70000000-0000-4000-8000-000000000001') from public.content_drafts where id='70000000-0000-4000-8000-000000000010';
select coalesce(release_id::text,'empty') as previous_release from public.content_publication \gset
set local role authenticated;
select throws_ok($$select public.publish_content_draft('70000000-0000-4000-8000-000000000010',1)$$,'22023','INVALID_MEDIA','failed copy prevents publish before receipt consumption');
reset role;
select is((select coalesce(release_id::text,'empty') from public.content_publication),:'previous_release','copy failure preserves publication pointer');
select is((select count(*)::int from private.content_validation_receipts where target_id='70000000-0000-4000-8000-000000000010'),1,'media rejection retains valid receipt');
insert into storage.objects(bucket_id,name,metadata) values('media-releases','releases/'||:'asset_id'||'/'||repeat('a',64),'{"size":4}');
select public.mark_media_copy(:'asset_id','70000000-0000-4000-8000-000000000001');
select is(public.get_public_asset(:'asset_id'),null::jsonb,'copied orphan stays unservable');
set local role authenticated;
select public.publish_content_draft('70000000-0000-4000-8000-000000000010',1) as released \gset
select is(public.get_public_asset(:'asset_id')->>'id',:'asset_id','successful transaction proves released bytes');
select public.archive_media_asset(:'asset_id');
select is(public.get_public_asset(:'asset_id')->>'id',:'asset_id','archiving preserves historic URLs');
select lives_ok(format('select public.save_content_draft(%L,0,(public.get_content_draft(%L)->%L))','70000000-0000-4000-8000-000000000011','70000000-0000-4000-8000-000000000010','snapshot'),'current release archive can be inherited into a new draft');
select throws_ok(format('select public.save_content_draft(%L,0,jsonb_set(public.get_content_draft(%L)->%L,array[%L,%L,%L],to_jsonb(%L::text)))','70000000-0000-4000-8000-000000000012','70000000-0000-4000-8000-000000000010','snapshot','media','asset_012d3bf8af92d486','profile','film'),'22023','INVALID_MEDIA','forged archived profile cannot be inherited');
reset role;
select throws_ok(format('delete from public.media_assets where id=%L',:'asset_id'),'23503',null,'historically referenced asset deletion is blocked by FK');
select public.attest_content_snapshot('draft',id,version,snapshot,'b1-v1-22cec87','70000000-0000-4000-8000-000000000001') from public.content_drafts where id='70000000-0000-4000-8000-000000000011';
set local role authenticated;
select lives_ok($$select public.publish_content_draft('70000000-0000-4000-8000-000000000011',1)$$,'trusted baseline allows unchanged archive in ordinary publication');
select public.save_content_draft('70000000-0000-4000-8000-000000000013',0,'{"settings":{},"media":{}}');
reset role;
select public.attest_content_snapshot('draft',id,version,snapshot,'b1-v1-22cec87','70000000-0000-4000-8000-000000000001') from public.content_drafts where id='70000000-0000-4000-8000-000000000013';
set local role authenticated;
select public.publish_content_draft('70000000-0000-4000-8000-000000000013',1);
select throws_ok(format('select public.save_content_draft(%L,0,(public.get_content_draft(%L)->%L))','70000000-0000-4000-8000-000000000014','70000000-0000-4000-8000-000000000010','snapshot'),'22023','INVALID_MEDIA','history alone cannot authorize archive into an unrelated draft');
reset role;
select public.attest_content_snapshot('release',id,0,snapshot,'b1-v1-22cec87','70000000-0000-4000-8000-000000000001') from public.content_releases where id=:'released';
set local role authenticated;
select lives_ok(format('select public.rollback_content_release(%L)',:'released'),'archived released assets allow historical rollback');
select throws_ok($$delete from public.media_assets$$,'42501',null,'referenced inventory cannot be deleted by browser');
reset role;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.publish_content_draft('70000000-0000-4000-8000-000000000010',1)$$,'42501','FORBIDDEN','editor cannot publish media');
select throws_ok(format('select public.complete_media_asset(%L,%L,%L)',:'asset_id','70000000-0000-4000-8000-000000000002','{}'),'42501',null,'browser cannot attest file metadata');
reset role;
select set_config('request.jwt.claims','{"sub":"70000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.create_media_upload('x.png',4,'image/png','asset_012d3bf8af92d486')$$,'42501','FORBIDDEN','operations cannot upload');
reset role;
set local role anon;
select is((select count(*)::int from storage.objects where bucket_id in ('media-originals','media-releases')),0,'anonymous cannot read either private bucket');
reset role;
select * from finish();
rollback;
