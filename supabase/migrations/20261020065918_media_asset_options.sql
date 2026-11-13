-- Selection is independent of the recent mixed-status library window.
create index media_assets_ready_usage_page on public.media_assets(usage_key,created_at desc,id desc) where status='ready';
create function public.list_media_options(usage_key text,search text default '',after_created_at timestamptz default null,after_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin','editor']);
 if usage_key is null or not exists(select 1 from private.media_profiles p where p.usage_key=list_media_options.usage_key) or search is null or length(search)>100 or (after_created_at is null)<>(after_id is null) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 return (
  with candidates as materialized (
   select a.id,a.file_name,a.created_at from public.media_assets a join private.media_profiles p on p.usage_key=a.usage_key
   where a.status='ready' and a.usage_key=list_media_options.usage_key and not(p.policy ? 'readOnlyReason')
   and (search='' or strpos(lower(a.file_name),lower(search))>0 or strpos(a.id::text,lower(search))>0)
   and (after_created_at is null or (a.created_at,a.id)<(after_created_at,after_id))
   order by a.created_at desc,a.id desc limit 26
  ), page as (select * from candidates order by created_at desc,id desc limit 25)
  select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'fileName',file_name) order by created_at desc,id desc) from page),'[]'::jsonb),
   'nextCursor',case when (select count(*) from candidates)>25 then (select jsonb_build_object('createdAt',created_at,'id',id) from page order by created_at desc,id desc offset 24 limit 1) else null end)
 );
end$$;
revoke all on function public.list_media_options(text,text,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.list_media_options(text,text,timestamptz,uuid) to authenticated;
