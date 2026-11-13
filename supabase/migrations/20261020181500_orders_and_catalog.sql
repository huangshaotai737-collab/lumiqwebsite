-- Commercial values are deliberately absent until a current admin explicitly confirms them.
create table public.catalog_offerings (
 id uuid primary key default gen_random_uuid(),
 product_id text not null unique check(product_id in ('ola','ola-go','tablet','print','nest')),
 name text not null check(char_length(name) between 1 and 120),
 currency text check(currency in ('USD','EUR','GBP','JPY','KRW','TWD')),
 unit_minor bigint check(unit_minor between 0 and 9007199254740991),
 confirmed boolean not null default false,
 enabled boolean not null default false,
 version integer not null default 0 check(version>=0),
 check((currency is null)=(unit_minor is null)),
 check(not confirmed or unit_minor is not null),
 check(not enabled or confirmed),
 check(product_id<>'ola-go' or (not confirmed and not enabled and unit_minor is null))
);
insert into public.catalog_offerings(product_id,name) values ('ola','LumiQ Ola'),('ola-go','LumiQ Ola Go'),('tablet','LumiQ Tablet'),('print','LumiQ Print'),('nest','LumiQ Orb');
create table public.commerce_settings (
 singleton boolean primary key default true check(singleton),
 orders_enabled boolean not null default false,
 approved_terms_release_id uuid references public.content_releases(id),
 approved_terms_fingerprint text,
 version integer not null default 0 check(version>=0),
 check((approved_terms_release_id is null)=(approved_terms_fingerprint is null)),
 check(not orders_enabled or approved_terms_release_id is not null)
);
insert into public.commerce_settings(singleton) values(true);
create table public.customer_orders (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id),
 idempotency_key text not null check(idempotency_key ~ '^[A-Za-z0-9_-]{8,128}$'),
 request_digest text not null,
 status text not null default 'pending_payment_setup' check(status in ('pending_payment_setup','cancelled')),
 payment_status text not null default 'not_configured' check(payment_status='not_configured'),
 fulfillment_status text not null default 'not_scheduled' check(fulfillment_status='not_scheduled'),
 currency text not null check(currency in ('USD','EUR','GBP','JPY','KRW','TWD')),
 items_minor bigint not null check(items_minor between 0 and 9007199254740991),
 shipping_minor bigint check(shipping_minor is null),
 tax_minor bigint check(tax_minor is null),
 payable_minor bigint check(payable_minor is null),
 shipping_address jsonb not null,
 terms_release_id uuid not null references public.content_releases(id),
 created_at timestamptz not null default now(),
 unique(user_id,idempotency_key)
);
create index customer_orders_owner_created on public.customer_orders(user_id,created_at desc,id desc);
create table public.order_items (
 order_id uuid not null references public.customer_orders(id),
 sku_id uuid not null references public.catalog_offerings(id),
 product_id text not null check(product_id in ('ola','tablet','print','nest')),
 name text not null,
 quantity integer not null check(quantity between 1 and 99),
 unit_minor bigint not null check(unit_minor between 0 and 9007199254740991),
 offering_version integer not null,
 primary key(order_id,sku_id)
);
alter table public.catalog_offerings enable row level security;
alter table public.commerce_settings enable row level security;
alter table public.customer_orders enable row level security;
alter table public.order_items enable row level security;
revoke all on public.catalog_offerings,public.commerce_settings,public.customer_orders,public.order_items from public,anon,authenticated,service_role;
-- DB Auth state, not editable JWT metadata, protects even direct RPC / Data API calls.
create function private.current_customer_is_verified() returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users u join public.profiles p on p.user_id=u.id where u.id=auth.uid() and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) and p.access_state='active');
$$;
create function private.lock_verified_customer() returns uuid
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null and not coalesce(u.is_anonymous,false) for share;
 if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 perform 1 from public.profiles p where p.user_id=actor and p.access_state='active' for share;
 if not found then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 return actor;
end;
$$;
revoke all on function private.current_customer_is_verified(),private.lock_verified_customer() from public,anon,authenticated,service_role;
grant execute on function private.current_customer_is_verified() to authenticated;
grant select on public.customer_orders,public.order_items to authenticated;
create policy customer_orders_read_own on public.customer_orders for select to authenticated using(user_id=auth.uid() and (select private.current_customer_is_verified()));
create policy order_items_read_own on public.order_items for select to authenticated using(exists(select 1 from public.customer_orders o where o.id=order_id and o.user_id=auth.uid()));

-- Fixed dependencies of the code-owned terms renderer, in every supported locale.
create function private.commercial_terms_payload(snapshot jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare locale text; key text; legal jsonb; parts jsonb:='{}';
begin
 foreach locale in array array['en','zh-hant','ja'] loop
  legal:=snapshot#>array['messages',locale,'Legal'];
  foreach key in array array['title','intro','p1','h1','p2','h2','p3','h3','p4','h4','p5'] loop
   if jsonb_typeof(legal#>array['terms',key]) is distinct from 'string' then raise exception 'invalid published terms' using errcode='22023'; end if;
  end loop;
  if jsonb_typeof(legal->'eyebrow') is distinct from 'string' or jsonb_typeof(legal->'draft') is distinct from 'string' then raise exception 'invalid published terms' using errcode='22023'; end if;
  foreach key in array array['shipping','returns','warranty'] loop
   if jsonb_typeof(snapshot#>array['messages',locale,'Products',key]) is distinct from 'string' then raise exception 'invalid commercial promise' using errcode='22023'; end if;
  end loop;
  parts:=parts||jsonb_build_object(locale,jsonb_build_object('terms',(select jsonb_object_agg(k,legal#>array['terms',k]) from unnest(array['title','intro','p1','h1','p2','h2','p3','h3','p4','h4','p5']) k),'eyebrow',legal->'eyebrow','draft',legal->'draft','shipping',snapshot#>array['messages',locale,'Products','shipping'],'returns',snapshot#>array['messages',locale,'Products','returns'],'warranty',snapshot#>array['messages',locale,'Products','warranty']));
 end loop;
 return parts;
end;
$$;
create function private.commercial_terms_fingerprint(snapshot jsonb) returns text language sql immutable set search_path='' as $$
 select encode(extensions.digest(private.commercial_terms_payload(snapshot)::text,'sha256'),'hex');
$$;
revoke all on function private.commercial_terms_payload(jsonb),private.commercial_terms_fingerprint(jsonb) from public,anon,authenticated,service_role;
create function public.set_catalog_offering(sku_id uuid,currency text,unit_minor numeric,confirmed boolean,enabled boolean,expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare offering public.catalog_offerings%rowtype;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin']);
 perform pg_advisory_xact_lock(7411111); -- exclusive commercial snapshot change
 if currency is null or currency not in ('USD','EUR','GBP','JPY','KRW','TWD') or unit_minor is null or unit_minor<0 or unit_minor>9007199254740991 or unit_minor<>trunc(unit_minor) or confirmed is null or enabled is null or (enabled and not confirmed) or expected_version is null or expected_version<0 or expected_version>2147483646 then raise exception 'invalid offering' using errcode='22023'; end if;
 select * into offering from public.catalog_offerings c where c.id=sku_id for update;
 if not found then raise exception 'offering not found' using errcode='P0002'; end if;
 if offering.product_id='ola-go' then raise exception 'Go is not independently chargeable' using errcode='22023'; end if;
 if offering.version<>expected_version then raise exception 'version conflict' using errcode='23505'; end if;
 update public.catalog_offerings c set currency=set_catalog_offering.currency,unit_minor=set_catalog_offering.unit_minor::bigint,confirmed=set_catalog_offering.confirmed,enabled=set_catalog_offering.enabled,version=c.version+1 where c.id=sku_id;
 perform private.append_audit('settings.catalog_updated','catalog_offering',sku_id,jsonb_build_object('currency',currency,'unitMinor',unit_minor,'confirmed',confirmed,'enabled',enabled,'version',offering.version+1));
end;
$$;
create function public.update_commerce_settings(orders_enabled boolean,terms_release_id uuid,expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare settings public.commerce_settings%rowtype; published uuid; fingerprint text;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin']);
 perform pg_advisory_xact_lock(7411111); -- exclusive commercial snapshot change
 if orders_enabled is null or expected_version is null or expected_version<0 or expected_version>2147483646 then raise exception 'invalid settings' using errcode='22023'; end if;
 select * into settings from public.commerce_settings s where singleton for update;
 if settings.version<>expected_version then raise exception 'version conflict' using errcode='23505'; end if;
 select p.release_id into published from public.content_publication p where singleton for share;
 if terms_release_id is not null then
  if terms_release_id is distinct from published then raise exception 'approve only current publication' using errcode='22023'; end if;
  select private.commercial_terms_fingerprint(r.snapshot) into fingerprint from public.content_releases r where r.id=published;
 elsif orders_enabled then raise exception 'terms approval required' using errcode='22023';
 end if;
 update public.commerce_settings s set orders_enabled=update_commerce_settings.orders_enabled,approved_terms_release_id=terms_release_id,approved_terms_fingerprint=fingerprint,version=s.version+1 where singleton;
 perform private.append_audit('settings.commerce_updated','commerce_settings',coalesce(terms_release_id,auth.uid()),jsonb_build_object('ordersEnabled',orders_enabled,'termsReleaseId',terms_release_id,'version',settings.version+1));
end;
$$;
create function public.get_catalog_workspace() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin']);
 return jsonb_build_object('termsCurrent',coalesce((select s.approved_terms_fingerprint=private.commercial_terms_fingerprint(r.snapshot) from public.commerce_settings s join public.content_publication p on p.singleton=s.singleton join public.content_releases r on r.id=p.release_id where s.approved_terms_release_id is not null),false),'offerings',(select jsonb_agg(jsonb_build_object('skuId',id,'productId',product_id,'name',name,'currency',currency,'unitMinor',unit_minor,'confirmed',confirmed,'enabled',enabled,'version',version) order by product_id) from public.catalog_offerings),
 'settings',(select jsonb_build_object('ordersEnabled',orders_enabled,'termsReleaseId',approved_terms_release_id,'version',version) from public.commerce_settings where singleton),
 'publishedReleaseId',(select release_id from public.content_publication where singleton));
end;
$$;
create function private.customer_order_json(order_id uuid) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',o.id,'userId',o.user_id,'status',o.status,'paymentStatus',o.payment_status,'fulfillmentStatus',o.fulfillment_status,'currency',o.currency,
 'totals',jsonb_build_object('itemsMinor',o.items_minor,'shippingMinor',o.shipping_minor,'taxMinor',o.tax_minor,'payableMinor',o.payable_minor),
 'items',(select jsonb_agg(jsonb_build_object('skuId',i.sku_id,'productId',i.product_id,'name',i.name,'quantity',i.quantity,'unitMinor',i.unit_minor) order by i.sku_id) from public.order_items i where i.order_id=o.id),'createdAt',o.created_at)
 from public.customer_orders o where o.id=order_id;
$$;
revoke all on function private.customer_order_json(uuid) from public,anon,authenticated,service_role;
create function private.validate_order_request(request jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare item jsonb; address jsonb; key text; max_length integer; ids uuid[]:='{}'; sku uuid; qty numeric; normalized jsonb:='[]';
begin
 if request is null or jsonb_typeof(request)<>'object' or (select count(*) from jsonb_object_keys(request))<>4 or not(request ?& array['idempotencyKey','items','shippingAddress','termsVersion']) or jsonb_typeof(request->'idempotencyKey')<>'string' or request->>'idempotencyKey' !~ '^[A-Za-z0-9_-]{8,128}$' or jsonb_typeof(request->'termsVersion')<>'string' or request->>'termsVersion' !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or jsonb_typeof(request->'items')<>'array' then raise exception 'invalid order' using errcode='22023'; end if;
 if jsonb_array_length(request->'items') not between 1 and 5 then raise exception 'invalid items' using errcode='22023'; end if;
 for item in select value from jsonb_array_elements(request->'items') loop
  if jsonb_typeof(item)<>'object' or (select count(*) from jsonb_object_keys(item))<>2 or not(item ?& array['skuId','quantity']) or jsonb_typeof(item->'skuId')<>'string' or item->>'skuId' !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' or jsonb_typeof(item->'quantity')<>'number' then raise exception 'invalid item' using errcode='22023'; end if;
  sku:=(item->>'skuId')::uuid;qty:=(item->>'quantity')::numeric;
  if sku=any(ids) or qty<>trunc(qty) or qty<1 or qty>99 then raise exception 'invalid quantity' using errcode='22023'; end if;
  ids:=array_append(ids,sku);normalized:=normalized||jsonb_build_array(jsonb_build_object('skuId',sku,'quantity',qty::integer));
 end loop;
 address:=request->'shippingAddress';
 if jsonb_typeof(address)<>'object' or (select count(*) from jsonb_object_keys(address))<>8 or not(address ?& array['name','country','region','city','postalCode','line1','line2','phone']) then raise exception 'invalid address' using errcode='22023'; end if;
 foreach key in array array['name','country','region','city','postalCode','line1','line2','phone'] loop
  max_length:=case key when 'country' then 2 when 'postalCode' then 32 when 'phone' then 40 when 'line1' then 500 when 'line2' then 500 else 120 end;
  if jsonb_typeof(address->key)<>'string' or char_length(address->>key)>max_length or (address->>key) ~ '[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]' or (key not in ('line1','line2') and (address->>key) ~ E'[\r\n\t]') then raise exception 'invalid address field' using errcode='22023'; end if;
 end loop;
 if btrim(address->>'name')='' or btrim(address->>'city')='' or btrim(address->>'line1')='' or not((address->>'country')=any(string_to_array('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW',' '))) then raise exception 'invalid address' using errcode='22023'; end if;
 return jsonb_build_object('idempotencyKey',request->>'idempotencyKey','items',normalized,'shippingAddress',address,'termsVersion',(request->>'termsVersion')::uuid);
end;
$$;
revoke all on function private.validate_order_request(jsonb) from public,anon,authenticated,service_role;
create function public.create_customer_order(request jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; normalized jsonb; digest text; existing public.customer_orders%rowtype; settings public.commerce_settings%rowtype; published uuid; fingerprint text; offering public.catalog_offerings%rowtype; item jsonb; order_id uuid; currency text; subtotal numeric:=0; item_count integer:=0;
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
 insert into public.customer_orders(user_id,idempotency_key,request_digest,currency,items_minor,shipping_address,terms_release_id)
 values(actor,normalized->>'idempotencyKey',digest,currency,subtotal::bigint,normalized->'shippingAddress',settings.approved_terms_release_id) returning id into order_id;
 insert into public.order_items(order_id,sku_id,product_id,name,quantity,unit_minor,offering_version)
 select order_id,c.id,c.product_id,c.name,(i.value->>'quantity')::integer,c.unit_minor,c.version from jsonb_array_elements(normalized->'items') i join public.catalog_offerings c on c.id=(i.value->>'skuId')::uuid;
 perform private.append_audit('orders.created','customer_order',order_id,jsonb_build_object('itemCount',item_count,'currency',currency,'itemsMinor',subtotal));
 return jsonb_build_object('order',private.customer_order_json(order_id),'reused',false);
end;
$$;
create function public.get_customer_order(order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.lock_verified_customer();
begin
 if not exists(select 1 from public.customer_orders o where o.id=order_id and o.user_id=actor) then raise exception 'order not found' using errcode='P0002'; end if;
 return private.customer_order_json(order_id);
end;
$$;
create function public.list_customer_orders(page integer default 1,page_size integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.lock_verified_customer();
begin
 if page is null or page<1 or page>1000000 or page_size is null or page_size<1 or page_size>100 then raise exception 'invalid pagination' using errcode='22023'; end if;
 return jsonb_build_object('items',coalesce((select jsonb_agg(private.customer_order_json(s.id) order by s.created_at desc,s.id desc) from(select o.id,o.created_at from public.customer_orders o where o.user_id=actor order by o.created_at desc,o.id desc limit page_size offset (page::bigint-1)*page_size) s),'[]'::jsonb),'total',(select count(*) from public.customer_orders o where o.user_id=actor),'page',page,'pageSize',page_size);
end;
$$;
create function public.cancel_customer_order(order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.lock_verified_customer(); existing public.customer_orders%rowtype;
begin
 select * into existing from public.customer_orders o where o.id=order_id and o.user_id=actor;
 if not found then raise exception 'order not found' using errcode='P0002'; end if;
 perform pg_advisory_xact_lock(hashtextextended('customer-order:'||actor::text||':'||existing.idempotency_key,0));
 select * into existing from public.customer_orders o where o.id=order_id and o.user_id=actor for update;
 if existing.status<>'cancelled' then
  update public.customer_orders o set status='cancelled' where o.id=order_id;
  perform private.append_audit('orders.cancelled','customer_order',order_id,'{}');
 end if;
 return private.customer_order_json(order_id);
end;
$$;
revoke all on function public.set_catalog_offering(uuid,text,numeric,boolean,boolean,integer),public.update_commerce_settings(boolean,uuid,integer),public.get_catalog_workspace(),public.create_customer_order(jsonb),public.get_customer_order(uuid),public.list_customer_orders(integer,integer),public.cancel_customer_order(uuid) from public,anon,authenticated,service_role;
grant execute on function public.set_catalog_offering(uuid,text,numeric,boolean,boolean,integer),public.update_commerce_settings(boolean,uuid,integer),public.get_catalog_workspace(),public.create_customer_order(jsonb),public.get_customer_order(uuid),public.list_customer_orders(integer,integer),public.cancel_customer_order(uuid) to authenticated;

-- Anonymous read of only confirmed commercial data. All CTEs share one SQL statement snapshot.
create function public.get_ordering_catalog() returns jsonb
language sql stable security definer set search_path='' as $$
 with configuration as (
  select s.orders_enabled,s.approved_terms_release_id,s.approved_terms_fingerprint,a.snapshot as approved_snapshot,c.snapshot as current_snapshot
  from public.commerce_settings s left join public.content_releases a on a.id=s.approved_terms_release_id
  left join public.content_publication p on p.singleton=s.singleton left join public.content_releases c on c.id=p.release_id where s.singleton
 ), state as (
  select *,case when not orders_enabled then 'ORDERING_DISABLED' when approved_snapshot is null then 'TERMS_NOT_APPROVED'
  when current_snapshot is null or private.commercial_terms_fingerprint(current_snapshot) is distinct from approved_terms_fingerprint then 'TERMS_CHANGED' else null end as reason from configuration
 )
 select jsonb_build_object('orderingEnabled',reason is null,'unavailableReason',reason,
  'terms',case when approved_snapshot is null then null else jsonb_build_object('releaseId',approved_terms_release_id,'locales',private.commercial_terms_payload(approved_snapshot)) end,
  'offerings',coalesce((select jsonb_agg(jsonb_build_object('skuId',id,'productId',product_id,'name',name,'currency',currency,'unitMinor',unit_minor,'version',version) order by product_id) from public.catalog_offerings where confirmed and enabled and product_id<>'ola-go'),'[]'::jsonb)) from state;
$$;
revoke all on function public.get_ordering_catalog() from public,anon,authenticated,service_role;
grant execute on function public.get_ordering_catalog() to anon,authenticated;
