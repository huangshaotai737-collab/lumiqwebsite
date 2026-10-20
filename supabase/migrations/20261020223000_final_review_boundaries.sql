-- Correct final-review boundaries without rewriting applied history.


create or replace function public.get_admin_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$
declare role text;events jsonb;begin
 perform private.assert_staff_role(array['admin','editor','operations']);role:=private.current_staff_role();
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'action',action,'entityType',entity_type,'entityId',entity_id,'createdAt',created_at) order by created_at desc,id desc),'[]') into events from (select * from public.audit_events a where role='admin' or (a.actor_id=auth.uid() and ((role='editor' and (a.action like 'content.%' or a.action like 'media.%')) or (role='operations' and (a.action like 'customers.%' or a.action like 'orders.%' or a.action like 'waitlist.%')))) order by created_at desc,id desc limit 10) a;
 return jsonb_build_object('customers',case when role in ('admin','operations') then(select count(*) from public.profiles p join auth.users u on u.id=p.user_id where p.access_state<>'anonymized' and not u.is_anonymous and not exists(select 1 from public.staff_memberships s where s.user_id=p.user_id)) else null end,'waitlist',case when role in ('admin','operations') then(select count(*) from public.waitlist_signups) else null end,'orders',case when role in ('admin','operations') then(select count(*) from public.customer_orders) else null end,'drafts',case when role in ('admin','editor') then(select count(*) from public.content_drafts where status in ('editing','submitted')) else null end,'recentAudit',events);
end;$$;

create or replace function public.get_catalog_workspace() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin','operations']);
 return jsonb_build_object('termsCurrent',coalesce((select s.approved_terms_fingerprint=private.commercial_terms_fingerprint(r.snapshot) from public.commerce_settings s join public.content_publication p on p.singleton=s.singleton join public.content_releases r on r.id=p.release_id where s.approved_terms_release_id is not null),false),'offerings',(select jsonb_agg(jsonb_build_object('skuId',id,'productId',product_id,'name',name,'currency',currency,'unitMinor',unit_minor,'confirmed',confirmed,'enabled',enabled,'version',version) order by product_id) from public.catalog_offerings),
 'settings',(select jsonb_build_object('ordersEnabled',orders_enabled,'termsReleaseId',approved_terms_release_id,'version',version) from public.commerce_settings where singleton),
 'publishedReleaseId',(select release_id from public.content_publication where singleton));
end;
$$;

create or replace function private.assert_media_snapshot(snapshot jsonb,historical_release uuid default null,base_release uuid default null) returns void
language plpgsql set search_path='' as $$
declare slot record; a public.media_assets%rowtype; p jsonb; partner text;
begin
 if exists(select 1 from storage.buckets where id in ('media-originals','media-releases') and public) then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
 for slot in select key,value from jsonb_each(coalesce(snapshot->'media','{}')) loop
  select policy into p from private.media_profiles where usage_key=slot.key;
  if slot.value->>'assetId' is null then
   if p is null or slot.value->>'url' is distinct from p->>'legacyUrl'
    or slot.value->>'kind' is distinct from p->>'kind'
    or slot.value->>'profile' is distinct from p->>'profile'
   then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
   continue;
  end if;
  select * into a from public.media_assets where id=(slot.value->>'assetId')::uuid;
  select policy into p from private.media_profiles where usage_key=slot.key;
  if a.id is null or p is null or p ? 'readOnlyReason' or not(p->'mimes' ? a.mime) or a.usage_key<>slot.key or slot.value->>'url' is distinct from '/api/media/'||a.id::text or slot.value->>'kind' is distinct from p->>'kind' or slot.value->>'profile' is distinct from p->>'profile' or a.metadata->>'mime' is distinct from a.mime or a.release_path is null or
   not exists(select 1 from storage.objects o where bucket_id='media-releases' and name=a.release_path and (o.metadata->>'size')::bigint=a.advertised_size) or
   (historical_release is null and a.status<>'ready' and not (a.status='archived' and exists(
    select 1 from private.media_release_assets r join public.content_releases b on b.id=r.release_id
    where r.release_id=base_release and r.asset_id=a.id and r.usage_key=slot.key
    and b.snapshot->'media'->slot.key->>'assetId'=a.id::text
    and b.snapshot->'media'->slot.key->>'url'=slot.value->>'url'
    and b.snapshot->'media'->slot.key->>'kind'=slot.value->>'kind'
    and b.snapshot->'media'->slot.key->>'profile'=slot.value->>'profile'
   ))) or
   (historical_release is not null and not exists(select 1 from private.media_release_assets r where r.release_id=historical_release and r.asset_id=a.id and r.usage_key=slot.key))
  then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
  for partner in select jsonb_array_elements_text(p->'companions') loop
   if snapshot->'media'->partner->>'assetId' is null then raise exception 'MEDIA_COMPANION_REQUIRED' using errcode='22023'; end if;
  end loop;
 end loop;
end$$;

create or replace function private.assert_media_selection(snapshot jsonb,baseline jsonb) returns void
language plpgsql set search_path='' as $$
declare slot record; a public.media_assets%rowtype; p jsonb;
begin
 for slot in select key,value from jsonb_each(coalesce(snapshot->'media','{}')) loop
  select policy into p from private.media_profiles where usage_key=slot.key;
  if slot.value->>'assetId' is null then
   if p is null or slot.value->>'url' is distinct from p->>'legacyUrl'
    or slot.value->>'kind' is distinct from p->>'kind'
    or slot.value->>'profile' is distinct from p->>'profile'
   then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
   continue;
  end if;
  select * into a from public.media_assets where id=(slot.value->>'assetId')::uuid;
  select policy into p from private.media_profiles where usage_key=slot.key;
  if a.id is null or p is null or p ? 'readOnlyReason' or a.usage_key<>slot.key or slot.value->>'kind' is distinct from p->>'kind' or slot.value->>'profile' is distinct from p->>'profile' or slot.value->>'url' is distinct from '/api/media/'||a.id::text or
    (a.status<>'ready' and not coalesce(a.status='archived' and baseline->'media'->slot.key->>'assetId'=a.id::text and baseline->'media'->slot.key->>'url'=slot.value->>'url' and baseline->'media'->slot.key->>'kind'=slot.value->>'kind' and baseline->'media'->slot.key->>'profile'=slot.value->>'profile',false)) then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
 end loop;
end$$;

update private.content_validation_policy set active_version='legacy-slots-v2-20261020' where singleton;
