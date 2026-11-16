-- Accept the two shipped Tablet replacements while retaining historical URLs.
-- Exact per-slot allowlists preserve rollback and reject arbitrary media paths.
update private.media_profiles set policy=jsonb_set(policy,'{additionalLegacyUrls}','["/assets/tablet-detail/generated/tablet-passive-new-scene-20261026.png"]'::jsonb) where usage_key='asset_27bcf70b57b916d5';
update private.media_profiles set policy=jsonb_set(policy,'{additionalLegacyUrls}','["/assets/tablet-detail/generated/tablet-family-new-scene-20261026.png"]'::jsonb) where usage_key='asset_4f5fb66ba7dc95fe';

create or replace function private.assert_media_snapshot(snapshot jsonb,historical_release uuid default null,base_release uuid default null) returns void
language plpgsql set search_path='' as $$
declare slot record; a public.media_assets%rowtype; p jsonb; partner text;
begin
 perform private.assert_product_image_aliases(snapshot);
 if exists(select 1 from storage.buckets where id in ('media-originals','media-releases') and public) then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
 for slot in select key,value from jsonb_each(coalesce(snapshot->'media','{}')) loop
  select policy into p from private.media_profiles where usage_key=slot.key;
  if slot.value->>'assetId' is null then
   if p is null or not (slot.value->>'url' = p->>'legacyUrl' or coalesce(p->'additionalLegacyUrls' ? (slot.value->>'url'),false))
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
 perform private.assert_product_image_aliases(snapshot);
 for slot in select key,value from jsonb_each(coalesce(snapshot->'media','{}')) loop
  select policy into p from private.media_profiles where usage_key=slot.key;
  if slot.value->>'assetId' is null then
   if p is null or not (slot.value->>'url' = p->>'legacyUrl' or coalesce(p->'additionalLegacyUrls' ? (slot.value->>'url'),false))
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
