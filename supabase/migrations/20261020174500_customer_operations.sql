-- Operational data is separate from original consent/signup records and public profiles.
create table public.waitlist_operations (
 signup_id uuid primary key references public.waitlist_signups(id) on delete cascade,
 status text not null default 'new' check(status in ('new','contacted','closed')),
 note text not null default '' check(char_length(note)<=2000),
 version integer not null default 0 check(version>=0)
);
create table public.customer_notes (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(user_id) on delete cascade,
 note text not null check(char_length(note) between 1 and 2000),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index customer_notes_user_created_idx on public.customer_notes(user_id,created_at desc,id desc);
create index waitlist_created_id_idx on public.waitlist_signups(created_at desc,id desc);
alter table public.waitlist_operations enable row level security;
alter table public.customer_notes enable row level security;
revoke all on public.waitlist_operations, public.customer_notes from public,anon,authenticated,service_role;

create function private.validate_operations_query(search text, page integer, page_size integer, status text default 'all') returns void
language plpgsql set search_path='' as $$
begin
 if search is null or char_length(search)>254 or page is null or page<1 or page>1000000 or page_size is null or page_size<1 or page_size>100 or status is null or status not in ('all','new','contacted','closed') then
  raise exception 'invalid operations query' using errcode='22023';
 end if;
end;
$$;
revoke all on function private.validate_operations_query(text,integer,integer,text) from public,anon,authenticated,service_role;

create function public.list_customer_operations(search text default '', page integer default 1, page_size integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare response jsonb;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','operations']);
 perform private.validate_operations_query(search,page,page_size);
 with matching as (
  select p.user_id as id,p.display_name as "displayName",coalesce(u.email,'') as email,u.created_at as "createdAt"
  from public.profiles p join auth.users u on u.id=p.user_id
  where p.access_state<>'anonymized' and not u.is_anonymous
   and not exists(select 1 from public.staff_memberships s where s.user_id=p.user_id)
   and (search='' or strpos(lower(coalesce(u.email,'')),lower(search))>0 or strpos(lower(p.display_name),lower(search))>0)
 ), sliced as(select * from matching order by "createdAt" desc,id desc limit page_size offset ((page::bigint-1)*page_size))
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(s) order by s."createdAt" desc,s.id desc) from sliced s),'[]'::jsonb),'total',(select count(*) from matching),'page',page,'pageSize',page_size) into response;
 return response;
end;
$$;
create function public.add_customer_note(user_id uuid,note text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','operations']);
 if note is null or char_length(btrim(note))<1 or char_length(note)>2000 then raise exception 'invalid note' using errcode='22023'; end if;
 if not exists(select 1 from public.profiles p where p.user_id=add_customer_note.user_id and p.access_state<>'anonymized') or exists(select 1 from public.staff_memberships s where s.user_id=add_customer_note.user_id) then raise exception 'customer not found' using errcode='P0002'; end if;
 insert into public.customer_notes(user_id,note,created_by) values(user_id,note,auth.uid());
 perform private.append_audit('customers.note_added','customer',user_id,'{}');
end;
$$;
create function public.list_customer_notes(user_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','operations']);
 if not exists(select 1 from public.profiles p where p.user_id=list_customer_notes.user_id and p.access_state<>'anonymized') or exists(select 1 from public.staff_memberships s where s.user_id=list_customer_notes.user_id) then raise exception 'customer not found' using errcode='P0002'; end if;
 return coalesce((select jsonb_agg(to_jsonb(n) order by n."createdAt" desc,n.id desc) from (select c.id,c.note,c.created_at as "createdAt" from public.customer_notes c where c.user_id=list_customer_notes.user_id order by c.created_at desc,c.id desc limit 100) n),'[]'::jsonb);
end;
$$;

create function public.list_waitlist_operations(search text default '',status text default 'all',page integer default 1,page_size integer default 25) returns jsonb
language plpgsql security definer set search_path='' as $$
declare response jsonb;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','operations']);
 perform private.validate_operations_query(search,page,page_size,status);
 with matching as (
  select w.id,w.email,w.source,w.consent_version as "consentVersion",w.created_at as "createdAt",coalesce(o.status,'new') as status,coalesce(o.note,'') as note,coalesce(o.version,0) as version
  from public.waitlist_signups w left join public.waitlist_operations o on o.signup_id=w.id
  where (search='' or strpos(lower(w.email),lower(search))>0) and (list_waitlist_operations.status='all' or coalesce(o.status,'new')=list_waitlist_operations.status)
 ), sliced as(select * from matching order by "createdAt" desc,id desc limit page_size offset ((page::bigint-1)*page_size))
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(s) order by s."createdAt" desc,s.id desc) from sliced s),'[]'::jsonb),'total',(select count(*) from matching),'page',page,'pageSize',page_size) into response;
 return response;
end;
$$;
create function public.update_waitlist_operations(id uuid,status text,note text,expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare current_version integer;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','operations']);
 if status is null or status not in ('new','contacted','closed') or note is null or char_length(note)>2000 or expected_version is null or expected_version<0 then raise exception 'invalid update' using errcode='22023'; end if;
 -- Lock the original row too: two first edits cannot both initialize version zero.
 perform 1 from public.waitlist_signups w where w.id=update_waitlist_operations.id for update;
 if not found then raise exception 'signup not found' using errcode='P0002'; end if;
 insert into public.waitlist_operations(signup_id) values(id) on conflict do nothing;
 select o.version into current_version from public.waitlist_operations o where o.signup_id=id for update;
 if current_version<>expected_version then raise exception 'version conflict' using errcode='23505'; end if;
 update public.waitlist_operations o set status=update_waitlist_operations.status,note=update_waitlist_operations.note,version=o.version+1 where o.signup_id=id;
 perform private.append_audit('waitlist.updated','waitlist_signup',id,jsonb_build_object('status',status,'version',current_version+1));
end;
$$;

-- Extend A3's atomic policy; export counts are also enforced within the authorized DB transaction.
alter table private.request_limits drop constraint request_limits_scope_check;
alter table private.request_limits add constraint request_limits_scope_check check(scope in ('signin','write','register','reset','waitlist','waitlist_export'));
create or replace function public.consume_request_limit(scope text,subject_hash text)
returns table(allowed boolean,retry_after_seconds integer)
language plpgsql security definer set search_path='' as $$
declare max_attempts integer; window_size interval; counter private.request_limits%rowtype; request_time timestamptz:=clock_timestamp();
begin
 if scope is null or scope not in ('signin','write','register','reset','waitlist','waitlist_export') or subject_hash is null or subject_hash !~ '^[a-f0-9]{64}$' then raise exception 'invalid limit request' using errcode='22023'; end if;
 max_attempts:=case scope when 'signin' then 10 when 'write' then 60 else 5 end;
 window_size:=case scope when 'write' then interval '1 minute' when 'waitlist_export' then interval '1 hour' else interval '15 minutes' end;
 insert into private.request_limits as limits(scope,subject_hash,attempts,expires_at) values(scope,subject_hash,1,request_time+window_size)
 on conflict on constraint request_limits_pkey do update set attempts=case when limits.expires_at<=request_time then 1 else least(limits.attempts+1,max_attempts+1) end,expires_at=case when limits.expires_at<=request_time then request_time+window_size else limits.expires_at end returning * into counter;
 return query select counter.attempts<=max_attempts,case when counter.attempts<=max_attempts then 0 else greatest(1,ceil(extract(epoch from counter.expires_at-request_time))::integer) end;
end;
$$;
create function public.export_waitlist_operations(search text default '',status text default 'all') returns jsonb
language plpgsql security definer set search_path='' as $$
declare rows jsonb; row_count integer; permitted boolean;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','operations']);
 perform private.validate_operations_query(search,1,100,status);
 -- Materialize the exact range once; the audit count and returned rows cannot diverge.
 select coalesce(jsonb_agg(to_jsonb(s) order by s."createdAt" desc,s.id desc),'[]'::jsonb) into rows from (
  select w.id,w.email,w.source,w.consent_version as "consentVersion",w.created_at as "createdAt",coalesce(o.status,'new') as status,coalesce(o.note,'') as note,coalesce(o.version,0) as version
  from public.waitlist_signups w left join public.waitlist_operations o on o.signup_id=w.id
  where (search='' or strpos(lower(w.email),lower(search))>0) and (export_waitlist_operations.status='all' or coalesce(o.status,'new')=export_waitlist_operations.status)
  order by w.created_at desc,w.id desc limit 10001
 ) s;
 row_count:=jsonb_array_length(rows);
 if row_count>10000 then raise exception 'narrow export range' using errcode='22023'; end if;
 select r.allowed into permitted from public.consume_request_limit('waitlist_export',encode(extensions.digest(auth.uid()::text,'sha256'),'hex')) r;
 if not permitted then raise exception 'export rate limited' using errcode='P0003'; end if;
 perform private.append_audit('waitlist.exported','waitlist_range',auth.uid(),jsonb_build_object('status',status,'hasSearch',search<>'','rowCount',row_count,'maxRows',10000,'order','created_at/id desc'));
 return rows;
end;
$$;
revoke all on function public.list_customer_operations(text,integer,integer),public.add_customer_note(uuid,text),public.list_customer_notes(uuid),public.list_waitlist_operations(text,text,integer,integer),public.update_waitlist_operations(uuid,text,text,integer),public.export_waitlist_operations(text,text) from public,anon,authenticated,service_role;
grant execute on function public.list_customer_operations(text,integer,integer),public.add_customer_note(uuid,text),public.list_customer_notes(uuid),public.list_waitlist_operations(text,text,integer,integer),public.update_waitlist_operations(uuid,text,text,integer),public.export_waitlist_operations(text,text) to authenticated;
