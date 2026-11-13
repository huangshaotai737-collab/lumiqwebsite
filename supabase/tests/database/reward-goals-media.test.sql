begin;
select plan(8);
create function pg_temp.reward_snapshot(slot text,url text) returns jsonb language sql as $$
 select jsonb_build_object('products','{}'::jsonb,'media',jsonb_build_object(slot,jsonb_build_object('assetId',null,'url',url,'kind','image','profile',slot)));
$$;
select lives_ok($$select private.assert_media_selection(pg_temp.reward_snapshot('asset_3dbef3e285441f46','/assets/orb-ui-20261103/reward-goals.png'),'{}')$$,'supplied populated reward image can be saved');
select lives_ok($$select private.assert_media_snapshot(pg_temp.reward_snapshot('asset_3dbef3e285441f46','/assets/orb-ui-20261103/reward-goals.png'))$$,'supplied populated reward image can be published');
select lives_ok($$select private.assert_media_selection(pg_temp.reward_snapshot('asset_3dbef3e285441f46','/assets/orb-ui-20261102/rewards.webp'),'{}')$$,'historical reward image stays editable');
select lives_ok($$select private.assert_media_snapshot(pg_temp.reward_snapshot('asset_3dbef3e285441f46','/assets/orb-ui-20261102/rewards.webp'))$$,'historical reward image stays valid for rollback');
select throws_ok($$select private.assert_media_selection(pg_temp.reward_snapshot('asset_3dbef3e285441f46','https://example.invalid/image.png'),'{}')$$,'22023','INVALID_MEDIA','external image remains rejected');
select throws_ok($$select private.assert_media_snapshot(pg_temp.reward_snapshot('asset_3dbef3e285441f46','/assets/unknown.png'))$$,'22023','INVALID_MEDIA','unregistered image remains rejected');
select throws_ok($$select private.assert_media_selection(pg_temp.reward_snapshot('asset_a9189b139b2ce05e','/assets/orb-ui-20261103/reward-goals.png'),'{}')$$,'22023','INVALID_MEDIA','reward image cannot be borrowed by the tasks slot');
select throws_ok($$select private.assert_media_snapshot(jsonb_set(pg_temp.reward_snapshot('asset_3dbef3e285441f46','/assets/orb-ui-20261103/reward-goals.png'),'{media,asset_3dbef3e285441f46,kind}','"video"'))$$,'22023','INVALID_MEDIA','media kind validation stays enforced');
select * from finish();
rollback;
