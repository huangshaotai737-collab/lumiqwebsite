-- A narrow staff read; no table grants, paths, user identities or content snapshots.
create index media_assets_library_page on public.media_assets(created_at desc,id desc);
create index media_release_assets_asset_lookup on private.media_release_assets(asset_id,release_id);

create function public.list_media_library(search text default '',usage_key text default null,asset_status text default null,reference_state text default null,page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin','editor']);
 if search is null or length(search)>100 or page is null or page<1
  or (usage_key is not null and not exists(select 1 from private.media_profiles p where p.usage_key=list_media_library.usage_key))
  or (asset_status is not null and asset_status not in ('pending','ready','archived'))
  or (reference_state is not null and reference_state not in ('draft','published','history','unreferenced'))
 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 return (
  with draft_refs as materialized (
   select d.id,d.version,d.status,d.updated_at,slot.key as usage_key,slot.value->>'assetId' as asset_id
   from public.content_drafts d cross join lateral jsonb_each(coalesce(d.snapshot->'media','{}'::jsonb)) slot
   where slot.value->>'assetId' is not null
  ), release_refs as materialized (
   select r.asset_id,r.release_id,r.usage_key,c.created_at,coalesce(p.release_id=r.release_id,false) as is_current
   from private.media_release_assets r join public.content_releases c on c.id=r.release_id
   left join public.content_publication p on p.singleton
   where c.snapshot->'media'->r.usage_key->>'assetId'=r.asset_id::text
  ), matched as materialized (
   select a.id,a.created_at,a.file_name,a.usage_key,a.mime,a.advertised_size,a.status from public.media_assets a left join private.media_profiles p on p.usage_key=a.usage_key
   where (list_media_library.usage_key is null or a.usage_key=list_media_library.usage_key)
    and (asset_status is null or a.status=asset_status)
    and (search='' or strpos(lower(a.file_name),lower(search))>0 or strpos(a.id::text,lower(search))>0
     or strpos(lower(a.usage_key),lower(search))>0 or strpos(lower(p.policy->>'profile'),lower(search))>0 or strpos(lower(p.policy->>'legacyUrl'),lower(search))>0)
    and (reference_state is null
     or (reference_state='draft' and exists(select 1 from draft_refs d where d.asset_id=a.id::text))
     or (reference_state='published' and exists(select 1 from release_refs r where r.asset_id=a.id and r.is_current))
     or (reference_state='history' and exists(select 1 from release_refs r where r.asset_id=a.id and not r.is_current))
     or (reference_state='unreferenced' and not exists(select 1 from draft_refs d where d.asset_id=a.id::text) and not exists(select 1 from release_refs r where r.asset_id=a.id)))
  ), paged as (select * from matched a order by a.created_at desc,a.id desc limit 25 offset ((page::bigint-1)*25))
  select jsonb_build_object('total',(select count(*) from matched),'page',page,'pageSize',25,
   'items',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'fileName',a.file_name,'usageKey',a.usage_key,'mime',a.mime,'size',a.advertised_size,'status',a.status,
    'references',jsonb_build_object(
     'draftCount',(select count(*) from draft_refs d where d.asset_id=a.id::text),
     'releaseCount',(select count(*) from release_refs r where r.asset_id=a.id),
     'currentPublication',exists(select 1 from release_refs r where r.asset_id=a.id and r.is_current),
     'drafts',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'version',d.version,'status',d.status,'usageKey',d.usage_key) order by d.updated_at desc,d.id desc,d.usage_key) from (select * from draft_refs d where d.asset_id=a.id::text order by d.updated_at desc,d.id desc,d.usage_key limit 5) d),'[]'::jsonb),
     'releases',coalesce((select jsonb_agg(jsonb_build_object('id',r.release_id,'usageKey',r.usage_key,'current',r.is_current) order by r.is_current desc,r.created_at desc,r.release_id desc,r.usage_key) from (select * from release_refs r where r.asset_id=a.id order by r.is_current desc,r.created_at desc,r.release_id desc,r.usage_key limit 5) r),'[]'::jsonb),
     'draftsTruncated',(select count(*)>5 from draft_refs d where d.asset_id=a.id::text),
     'releasesTruncated',(select count(*)>5 from release_refs r where r.asset_id=a.id)
    )) order by a.created_at desc,a.id desc) from paged a),'[]'::jsonb))
 );
end$$;
revoke all on function public.list_media_library(text,text,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.list_media_library(text,text,text,text,integer) to authenticated;
