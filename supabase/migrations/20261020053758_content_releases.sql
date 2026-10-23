-- Content tables are RPC-only. A service credential can attest validation, never mutate content.
create table public.content_drafts (
 id uuid primary key,
 version integer not null check(version>0),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and jsonb_typeof(snapshot->'settings')='object' and octet_length(snapshot::text)<=4194304),
 status text not null default 'editing' check(status in ('editing','submitted')),
 created_by uuid not null,
 updated_by uuid not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.content_releases (
 id uuid primary key default gen_random_uuid(),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 draft_id uuid references public.content_drafts(id),
 draft_version integer,
 rollback_of uuid references public.content_releases(id),
 created_by uuid not null,
 created_at timestamptz not null default now(),
 check((draft_id is not null and draft_version is not null and rollback_of is null) or (draft_id is null and draft_version is null and rollback_of is not null))
);
create table public.content_publication (
 singleton boolean primary key default true check(singleton),
 release_id uuid references public.content_releases(id),
 updated_at timestamptz not null default now()
);
insert into public.content_publication(singleton) values(true);
alter table public.content_drafts enable row level security;
alter table public.content_releases enable row level security;
alter table public.content_publication enable row level security;
revoke all on public.content_drafts,public.content_releases,public.content_publication from public,anon,authenticated,service_role;

-- Only a reviewed migration can advance the active policy. Update server policy in the same release.
create table private.content_validation_policy (
 singleton boolean primary key default true check(singleton),
 active_version text not null
);
insert into private.content_validation_policy values(true,'b1-v1-22cec87');
create table private.content_validation_receipts (
 purpose text not null check(purpose in ('draft','release')),
 target_id uuid not null,
 version integer not null,
 actor_id uuid not null,
 digest bytea not null,
 policy_version text not null,
 expires_at timestamptz not null,
 primary key(purpose,target_id,version,actor_id)
);
alter table private.content_validation_policy enable row level security;
alter table private.content_validation_receipts enable row level security;
revoke all on private.content_validation_policy,private.content_validation_receipts from public,anon,authenticated,service_role;

create function private.reject_content_release_mutation() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'content releases are immutable' using errcode='55000'; end$$;
revoke all on function private.reject_content_release_mutation() from public,anon,authenticated,service_role;
create trigger content_releases_no_mutation before update or delete on public.content_releases for each row execute function private.reject_content_release_mutation();
create trigger content_releases_no_truncate before truncate on public.content_releases for each statement execute function private.reject_content_release_mutation();

create function public.get_published_content() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('releaseId',r.id,'snapshot',r.snapshot)
 from public.content_publication p join public.content_releases r on r.id=p.release_id where p.singleton;
$$;
revoke all on function public.get_published_content() from public,anon,authenticated,service_role;
grant execute on function public.get_published_content() to anon,authenticated;

create function public.get_content_draft(id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare draft public.content_drafts%rowtype;
begin
 perform private.assert_staff_role(array['admin','editor']);
 select * into draft from public.content_drafts d where d.id=get_content_draft.id;
 if not found then return null; end if;
 return jsonb_build_object('id',draft.id,'version',draft.version,'snapshot',draft.snapshot,'status',draft.status,'updatedAt',draft.updated_at);
end$$;
create function public.get_content_release(id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin']);
 return (select jsonb_build_object('id',r.id,'snapshot',r.snapshot) from public.content_releases r where r.id=get_content_release.id);
end$$;
create function public.get_content_workspace() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin','editor']);
 return jsonb_build_object(
  'drafts',coalesce((select jsonb_agg(row) from (select id,version,status,updated_at as "updatedAt" from public.content_drafts order by updated_at desc limit 100) row),'[]'::jsonb),
  'releases',coalesce((select jsonb_agg(row) from (select id,draft_id as "draftId",draft_version as "draftVersion",rollback_of as "rollbackOf",created_at as "createdAt" from public.content_releases order by created_at desc,id desc limit 100) row),'[]'::jsonb),
  'publishedReleaseId',(select release_id from public.content_publication where singleton));
end$$;

create function public.save_content_draft(id uuid,expected_version integer,snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous public.content_drafts%rowtype; baseline jsonb; new_version integer;
begin
 -- Shares A4's lock so role revocation cannot race the final DB authorization.
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','editor']);
 if id is null or expected_version is null or expected_version<0 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 select * into previous from public.content_drafts d where d.id=save_content_draft.id for update;
 if (not found and expected_version<>0) or (found and previous.version<>expected_version) then raise exception 'CONFLICT' using errcode='23505'; end if;
 if private.current_staff_role()<>'admin' then
  baseline:=previous.snapshot;
  if baseline is null then select r.snapshot into baseline from public.content_publication p join public.content_releases r on r.id=p.release_id where p.singleton; end if;
  if baseline is null or snapshot->'settings' is distinct from baseline->'settings' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 end if;
 if snapshot is null or jsonb_typeof(snapshot)<>'object' or jsonb_typeof(snapshot->'settings') is distinct from 'object' then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 new_version:=expected_version+1;
 if previous.id is null then
  insert into public.content_drafts(id,version,snapshot,created_by,updated_by) values(id,new_version,snapshot,auth.uid(),auth.uid()) on conflict do nothing;
  if not found then raise exception 'CONFLICT' using errcode='23505'; end if;
 else
  update public.content_drafts d set snapshot=save_content_draft.snapshot,version=new_version,status='editing',updated_by=auth.uid(),updated_at=clock_timestamp() where d.id=save_content_draft.id;
 end if;
 delete from private.content_validation_receipts r where r.purpose='draft' and r.target_id=save_content_draft.id;
 perform private.append_audit('content.saved','content_draft',id,jsonb_build_object('version',new_version));
 return jsonb_build_object('id',id,'version',new_version);
end$$;
create function public.submit_content_draft(id uuid,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare new_version integer;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','editor']);
 update public.content_drafts d set status='submitted',version=d.version+1,updated_by=auth.uid(),updated_at=clock_timestamp()
 where d.id=submit_content_draft.id and d.version=expected_version returning version into new_version;
 if not found then raise exception 'CONFLICT' using errcode='23505'; end if;
 delete from private.content_validation_receipts r where r.purpose='draft' and r.target_id=submit_content_draft.id;
 perform private.append_audit('content.submitted','content_draft',id,jsonb_build_object('version',new_version));
 return jsonb_build_object('id',id,'version',new_version);
end$$;

-- Sole privileged handoff: server full FormatJS validation followed by exact locked JSONB equality.
-- This does not edit the snapshot, authorize a browser actor, or publish anything.
create function public.attest_content_snapshot(purpose text,id uuid,expected_version integer,normalized_snapshot jsonb,policy_version text,actor_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare stored jsonb; stored_version integer;
begin
 perform pg_advisory_xact_lock(7410404);
 if not exists(select 1 from public.staff_memberships s join public.profiles p using(user_id) where s.user_id=actor_id and s.role='admin' and s.active and p.access_state='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if policy_version is distinct from (select active_version from private.content_validation_policy where singleton) then raise exception 'VALIDATION_POLICY_MISMATCH' using errcode='22023'; end if;
 if purpose='draft' then
  select d.snapshot,d.version into stored,stored_version from public.content_drafts d where d.id=attest_content_snapshot.id for update;
 elsif purpose='release' then
  select r.snapshot,0 into stored,stored_version from public.content_releases r where r.id=attest_content_snapshot.id;
 else raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 if stored is null then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if stored_version is distinct from expected_version or stored is distinct from normalized_snapshot then raise exception 'CONFLICT' using errcode='23505'; end if;
 delete from private.content_validation_receipts where expires_at<=clock_timestamp();
 insert into private.content_validation_receipts(purpose,target_id,version,actor_id,digest,policy_version,expires_at)
 values(purpose,id,expected_version,actor_id,extensions.digest(stored::text,'sha256'),policy_version,clock_timestamp()+interval '5 minutes')
 on conflict on constraint content_validation_receipts_pkey do update set digest=excluded.digest,policy_version=excluded.policy_version,expires_at=excluded.expires_at;
end$$;
revoke all on function public.attest_content_snapshot(text,uuid,integer,jsonb,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.attest_content_snapshot(text,uuid,integer,jsonb,text,uuid) to service_role;

create function private.consume_content_validation(purpose text,id uuid,version integer,snapshot jsonb) returns void
language plpgsql set search_path='' as $$
begin
 delete from private.content_validation_receipts r where r.purpose=consume_content_validation.purpose and r.target_id=id and r.version=consume_content_validation.version
 and r.actor_id=auth.uid() and r.digest=extensions.digest(snapshot::text,'sha256')
 and r.policy_version=(select active_version from private.content_validation_policy where singleton) and r.expires_at>clock_timestamp();
 if not found then raise exception 'VALIDATION_REQUIRED' using errcode='22023'; end if;
end$$;
revoke all on function private.consume_content_validation(text,uuid,integer,jsonb) from public,anon,authenticated,service_role;

create function public.publish_content_draft(id uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare draft public.content_drafts%rowtype; new_release uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 perform pg_advisory_xact_lock(7410606); -- independent global publication/rollback serialization
 perform private.assert_staff_role(array['admin']);
 select * into draft from public.content_drafts d where d.id=publish_content_draft.id for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if draft.version is distinct from expected_version then raise exception 'CONFLICT' using errcode='23505'; end if;
 perform private.consume_content_validation('draft',id,draft.version,draft.snapshot);
 insert into public.content_releases(snapshot,draft_id,draft_version,created_by) values(draft.snapshot,id,draft.version,auth.uid()) returning content_releases.id into new_release;
 update public.content_publication set release_id=new_release,updated_at=clock_timestamp() where singleton;
 perform private.append_audit('content.published','content_release',new_release,jsonb_build_object('draftId',id,'version',draft.version));
 return new_release;
end$$;
create function public.rollback_content_release(release_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare target public.content_releases%rowtype; new_release uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 perform pg_advisory_xact_lock(7410606);
 perform private.assert_staff_role(array['admin']);
 select * into target from public.content_releases r where r.id=rollback_content_release.release_id;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 perform private.consume_content_validation('release',release_id,0,target.snapshot);
 insert into public.content_releases(snapshot,rollback_of,created_by) values(target.snapshot,release_id,auth.uid()) returning id into new_release;
 update public.content_publication set release_id=new_release,updated_at=clock_timestamp() where singleton;
 perform private.append_audit('content.rolled_back','content_release',new_release,jsonb_build_object('rollbackOf',release_id));
 return new_release;
end$$;
revoke all on function public.get_content_draft(uuid),public.get_content_release(uuid),public.get_content_workspace(),public.save_content_draft(uuid,integer,jsonb),public.submit_content_draft(uuid,integer),public.publish_content_draft(uuid,integer),public.rollback_content_release(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_content_draft(uuid),public.get_content_release(uuid),public.get_content_workspace(),public.save_content_draft(uuid,integer,jsonb),public.submit_content_draft(uuid,integer),public.publish_content_draft(uuid,integer),public.rollback_content_release(uuid) to authenticated;
