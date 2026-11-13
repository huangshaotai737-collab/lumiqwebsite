-- Audit corrections: product image aliases and direct-RPC new-order quota.
create function private.assert_product_image_aliases(snapshot jsonb) returns void
language plpgsql set search_path='' as $fn$
declare product record; expected jsonb := '{"ola":"/assets/web/ola-hero-front.webp","ola-go":"/assets/web/lumiq-ola-go.webp","tablet":"/assets/web/lumiq-tablet.webp","print":"/assets/web/lumiq-print.webp","nest":"/assets/web/nest15-oak-angle.webp"}'::jsonb;
begin
 for product in select key,value from jsonb_each(coalesce(snapshot->'products','{}')) loop
  if product.value->>'image' is distinct from expected->>product.key then
   raise exception 'INVALID_MEDIA' using errcode='22023';
  end if;
 end loop;
end;$fn$;
revoke all on function private.assert_product_image_aliases(jsonb) from public,anon,authenticated,service_role;

create or replace function private.assert_media_snapshot(snapshot jsonb,historical_release uuid default null,base_release uuid default null) returns void
language plpgsql set search_path='' as $$
declare slot record; a public.media_assets%rowtype; p jsonb; partner text;
begin
 perform private.assert_product_image_aliases(snapshot);
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
 perform private.assert_product_image_aliases(snapshot);
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

create or replace function public.create_customer_order(request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; normalized jsonb; digest text; existing public.customer_orders%rowtype; settings public.commerce_settings%rowtype; published uuid; fingerprint text; offering public.catalog_offerings%rowtype; item jsonb; order_id uuid; currency text; subtotal numeric:=0; item_count integer:=0; limit_allowed boolean;
begin
 actor:=private.lock_verified_customer();
 normalized:=private.validate_order_request(request);
 digest:=encode(extensions.digest(normalized::text,'sha256'),'hex');
 -- Same-owner key requests serialize before lookup; collisions only cause harmless waiting.
 perform pg_advisory_xact_lock(hashtextextended('customer-order:'||actor::text||':'||(normalized->>'idempotencyKey'),0));
 select * into existing from public.customer_orders o where o.user_id=actor and o.idempotency_key=normalized->>'idempotencyKey';
 if found then
  if existing.request_digest<>digest then raise exception 'idempotency request conflict' using errcode='23505'; end if;
  return jsonb_build_object('order',private.customer_order_json(existing.id),'reused',true);
 end if;
 perform pg_advisory_xact_lock_shared(7411111); -- concurrent orders, exclusive admin price/config changes
 select * into settings from public.commerce_settings s where singleton for share;
 if not settings.orders_enabled then raise exception 'ordering disabled' using errcode='P0004'; end if;
 if (normalized->>'termsVersion')::uuid is distinct from settings.approved_terms_release_id then raise exception 'terms changed' using errcode='23505'; end if;
 select p.release_id into published from public.content_publication p where singleton for share;
 select private.commercial_terms_fingerprint(r.snapshot) into fingerprint from public.content_releases r where r.id=published;
 if fingerprint is distinct from settings.approved_terms_fingerprint then raise exception 'terms approval required' using errcode='P0004'; end if;
 -- Lock every requested price, in stable order, before computing or persisting any line.
 perform 1 from public.catalog_offerings c where c.id in(select (value->>'skuId')::uuid from jsonb_array_elements(normalized->'items')) order by c.id for share;
 for item in select value from jsonb_array_elements(normalized->'items') loop
  select * into offering from public.catalog_offerings c where c.id=(item->>'skuId')::uuid;
  if not found or offering.product_id='ola-go' or not offering.confirmed or not offering.enabled or offering.unit_minor is null then raise exception 'offering unavailable' using errcode='P0004'; end if;
  if currency is not null and currency<>offering.currency then raise exception 'mixed currencies' using errcode='22023'; end if;
  currency:=offering.currency;subtotal:=subtotal+offering.unit_minor::numeric*(item->>'quantity')::integer;
  if subtotal>9007199254740991 then raise exception 'unsafe subtotal' using errcode='22023'; end if;
  item_count:=item_count+1;
 end loop;
 -- Count successful new creations, not idempotent recovery; failed SQL work rolls back.
 -- A namespaced DB-derived subject prevents direct JWT callers bypassing the quota.
 select allowed into limit_allowed from public.consume_request_limit('write',encode(extensions.digest('customer-order-quota:'||actor::text,'sha256'),'hex'));
 if not coalesce(limit_allowed,false) then raise exception 'order creation rate limited' using errcode='P0005'; end if;
 insert into public.customer_orders(user_id,idempotency_key,request_digest,currency,items_minor,shipping_address,terms_release_id)
 values(actor,normalized->>'idempotencyKey',digest,currency,subtotal::bigint,normalized->'shippingAddress',settings.approved_terms_release_id) returning id into order_id;
 insert into public.order_items(order_id,sku_id,product_id,name,quantity,unit_minor,offering_version)
 select order_id,c.id,c.product_id,c.name,(i.value->>'quantity')::integer,c.unit_minor,c.version from jsonb_array_elements(normalized->'items') i join public.catalog_offerings c on c.id=(i.value->>'skuId')::uuid;
 perform private.append_audit('orders.created','customer_order',order_id,jsonb_build_object('itemCount',item_count,'currency',currency,'itemsMinor',subtotal));
 return jsonb_build_object('order',private.customer_order_json(order_id),'reused',false);
end;
$$;

update private.content_validation_policy set active_version='media-products-v3-20261021' where singleton;
