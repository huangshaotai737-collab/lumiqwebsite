-- Internal-only order annotations. Customer Order projection remains unchanged.
create table public.order_notes (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.customer_orders(id),
 note text not null check(char_length(note) between 1 and 2000 and btrim(note)<>''),
 created_by uuid references public.profiles(user_id) on delete set null,
 created_at timestamptz not null default now()
);
create index order_notes_order_created on public.order_notes(order_id,created_at,id);
alter table public.order_notes enable row level security;
revoke all on public.order_notes from public,anon,authenticated,service_role;

create function public.list_staff_orders(search text default '',status text default 'all',page integer default 1,page_size integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare response jsonb;
begin
 perform private.assert_staff_role(array['admin','operations']);
 if search is null or char_length(search)>254 or status is null or status not in ('all','pending_payment_setup','cancelled') or page is null or page<1 or page>1000000 or page_size is null or page_size<1 or page_size>100 then raise exception 'invalid query' using errcode='22023'; end if;
 with matching as (
  select o.id,o.created_at from public.customer_orders o
  where (search='' or strpos(o.id::text,btrim(search))>0 or strpos(o.user_id::text,btrim(search))>0)
  and (list_staff_orders.status='all' or o.status=list_staff_orders.status)
 ), sliced as (select * from matching order by created_at desc,id desc limit page_size offset (page::bigint-1)*page_size)
 select jsonb_build_object('items',coalesce((select jsonb_agg(private.customer_order_json(s.id) order by s.created_at desc,s.id desc) from sliced s),'[]'::jsonb),'total',(select count(*) from matching),'page',page,'pageSize',page_size) into response;
 return response;
end;
$$;
create function public.get_staff_order(order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare response jsonb;
begin
 perform private.assert_staff_role(array['admin','operations']);
 select private.customer_order_json(order_id) into response;
 if response is null then raise exception 'order not found' using errcode='P0002'; end if;
 return response;
end;
$$;
create function public.get_staff_order_detail(order_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin','operations']);
 if not exists(select 1 from public.customer_orders o where o.id=order_id) then raise exception 'order not found' using errcode='P0002'; end if;
 return (select jsonb_build_object('shippingAddress',o.shipping_address,'termsVersion',o.terms_release_id,
 'notes',coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'note',n.note,'createdAt',n.created_at) order by n.created_at desc,n.id desc) from public.order_notes n where n.order_id=o.id),'[]'::jsonb),
 'cancelledAt',(select min(a.created_at) from public.audit_events a where a.entity_id=o.id and a.entity_type='customer_order' and a.action='orders.cancelled')) from public.customer_orders o where o.id=order_id);
end;
$$;
create function public.add_order_note(order_id uuid,note text) returns void
language plpgsql security definer set search_path='' as $$
declare note_id uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','operations']);
 if order_id is null or note is null or char_length(note)>2000 or btrim(note)='' then raise exception 'invalid note' using errcode='22023'; end if;
 perform 1 from public.customer_orders o where o.id=order_id for share;
 if not found then raise exception 'order not found' using errcode='P0002'; end if;
 insert into public.order_notes(order_id,note,created_by) values(order_id,note,auth.uid()) returning id into note_id;
 perform private.append_audit('orders.note_added','customer_order',order_id,jsonb_build_object('noteId',note_id));
end;
$$;
revoke all on function public.list_staff_orders(text,text,integer,integer),public.get_staff_order(uuid),public.get_staff_order_detail(uuid),public.add_order_note(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.list_staff_orders(text,text,integer,integer),public.get_staff_order(uuid),public.get_staff_order_detail(uuid),public.add_order_note(uuid,text) to authenticated;
