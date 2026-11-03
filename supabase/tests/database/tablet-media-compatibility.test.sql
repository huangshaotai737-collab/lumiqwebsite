begin;
select plan(8);
create function pg_temp.tablet_snapshot(slot text,url text) returns jsonb language sql as $$
 select jsonb_build_object('products','{}'::jsonb,'media',jsonb_build_object(slot,jsonb_build_object('assetId',null,'url',url,'kind','image','profile','public-content')));
$$;
select lives_ok($$select private.assert_media_selection(pg_temp.tablet_snapshot('asset_27bcf70b57b916d5','/assets/tablet-detail/generated/tablet-passive-new-scene-20261026.png'),'{}')$$,'current passive image can be saved');
select lives_ok($$select private.assert_media_snapshot(pg_temp.tablet_snapshot('asset_4f5fb66ba7dc95fe','/assets/tablet-detail/generated/tablet-family-new-scene-20261026.png'))$$,'current family image can be published');
select lives_ok($$select private.assert_media_selection(pg_temp.tablet_snapshot('asset_4f5fb66ba7dc95fe','/assets/tablet-detail/generated/tablet-active-story-time-back-muted-20261001.png'),'{}')$$,'historical family image stays editable');
select lives_ok($$select private.assert_media_snapshot(pg_temp.tablet_snapshot('asset_27bcf70b57b916d5','/assets/tablet-detail/generated/tablet-passive-screen-time-v2.png'))$$,'historical passive image stays valid for rollback');
select throws_ok($$select private.assert_media_selection(pg_temp.tablet_snapshot('asset_27bcf70b57b916d5','https://example.invalid/image.png'),'{}')$$,'22023','INVALID_MEDIA','external image remains rejected');
select throws_ok($$select private.assert_media_snapshot(pg_temp.tablet_snapshot('asset_4f5fb66ba7dc95fe','/assets/unknown.png'))$$,'22023','INVALID_MEDIA','unregistered local image remains rejected');
select throws_ok($$select private.assert_media_selection(pg_temp.tablet_snapshot('asset_27bcf70b57b916d5','/assets/tablet-detail/generated/tablet-family-new-scene-20261026.png'),'{}')$$,'22023','INVALID_MEDIA','replacement cannot be borrowed by a different slot');
select throws_ok($$select private.assert_media_snapshot(jsonb_set(pg_temp.tablet_snapshot('asset_4f5fb66ba7dc95fe','/assets/tablet-detail/generated/tablet-family-new-scene-20261026.png'),'{media,asset_4f5fb66ba7dc95fe,kind}','"video"'))$$,'22023','INVALID_MEDIA','media kind validation stays enforced');
select * from finish();
rollback;
