-- Remove records from the workspace while retaining immutable publication evidence.
begin;
create table private.content_record_deletions (
 kind text not null check(kind in ('draft','release')),
 record_id uuid not null,
 deleted_at timestamptz not null default clock_timestamp(),
 deleted_by uuid not null,
 primary key(kind,record_id)
);
alter table private.content_record_deletions enable row level security;
revoke all on private.content_record_deletions from public,anon,authenticated,service_role;
create function private.assert_content_record_available(kind text,id uuid) returns void
language plpgsql stable security definer set search_path='' as $$
begin
 if exists(select 1 from private.content_record_deletions x where x.kind=assert_content_record_available.kind and x.record_id=id) then
  raise exception 'NOT_FOUND' using errcode='P0002';
 end if;
end$$;
revoke all on function private.assert_content_record_available(text,uuid) from public,anon,authenticated,service_role;

create function public.delete_content_record(record_kind text,record_id uuid,expected_version integer default null) returns void
language plpgsql security definer set search_path='' as $$
declare version integer;
begin
 perform pg_advisory_xact_lock(7410404);
 perform pg_advisory_xact_lock(7410606);
 perform private.assert_staff_role(array['admin']);
 if record_kind is null or record_kind not in ('draft','release') or record_id is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 perform private.assert_content_record_available(record_kind,record_id);
 if record_kind='draft' then
  select d.version into version from public.content_drafts d where d.id=record_id;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if expected_version is distinct from version then raise exception 'CONFLICT' using errcode='23505'; end if;
 else
  if not exists(select 1 from public.content_releases r where r.id=record_id) then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if exists(select 1 from public.content_publication p where p.release_id=record_id) then raise exception 'CURRENT_RELEASE' using errcode='23505'; end if;
 end if;
 insert into private.content_record_deletions(kind,record_id,deleted_by) values(record_kind,record_id,auth.uid());
 perform private.append_audit('content.'||record_kind||'_deleted','content_'||record_kind,record_id,jsonb_build_object('version',version));
end$$;

-- Preserve the installed implementations and their validation, media and role rules.
alter function public.get_content_draft(uuid) set schema private;
revoke all on function private.get_content_draft(uuid) from public,anon,authenticated,service_role;
create function public.get_content_draft(id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin','editor']);
 if exists(select 1 from private.content_record_deletions x where x.kind='draft' and x.record_id=id) then return null; end if;
 return private.get_content_draft(id);
end$$;
revoke all on function public.get_content_draft(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_content_draft(uuid) to authenticated;
alter function public.get_content_release(uuid) set schema private;
revoke all on function private.get_content_release(uuid) from public,anon,authenticated,service_role;
create function public.get_content_release(id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin']);
 if exists(select 1 from private.content_record_deletions x where x.kind='release' and x.record_id=id) then return null; end if;
 return private.get_content_release(id);
end$$;
revoke all on function public.get_content_release(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_content_release(uuid) to authenticated;
alter function public.save_content_draft(uuid,integer,jsonb) set schema private;
revoke all on function private.save_content_draft(uuid,integer,jsonb) from public,anon,authenticated,service_role;
create function public.save_content_draft(id uuid,expected_version integer,snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','editor']);
 perform private.assert_content_record_available('draft',id);
 return private.save_content_draft(id,expected_version,snapshot);
end$$;
revoke all on function public.save_content_draft(uuid,integer,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.save_content_draft(uuid,integer,jsonb) to authenticated;
alter function public.submit_content_draft(uuid,integer) set schema private;
revoke all on function private.submit_content_draft(uuid,integer) from public,anon,authenticated,service_role;
create function public.submit_content_draft(id uuid,expected_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','editor']);
 perform private.assert_content_record_available('draft',id);
 return private.submit_content_draft(id,expected_version);
end$$;
revoke all on function public.submit_content_draft(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.submit_content_draft(uuid,integer) to authenticated;
alter function public.publish_content_draft(uuid,integer) set schema private;
revoke all on function private.publish_content_draft(uuid,integer) from public,anon,authenticated,service_role;
create function public.publish_content_draft(id uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin']);
 perform private.assert_content_record_available('draft',id);
 return private.publish_content_draft(id,expected_version);
end$$;
revoke all on function public.publish_content_draft(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.publish_content_draft(uuid,integer) to authenticated;
alter function public.rollback_content_release(uuid) set schema private;
revoke all on function private.rollback_content_release(uuid) from public,anon,authenticated,service_role;
create function public.rollback_content_release(release_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin']);
 perform private.assert_content_record_available('release',release_id);
 return private.rollback_content_release(release_id);
end$$;
revoke all on function public.rollback_content_release(uuid) from public,anon,authenticated,service_role;
grant execute on function public.rollback_content_release(uuid) to authenticated;

create function public.get_paginated_content_workspace(draft_page integer default 1,release_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare drafts_total bigint; releases_total bigint; dp integer; rp integer; drafts jsonb; releases jsonb;
begin
 perform private.assert_staff_role(array['admin','editor']);
 if draft_page is null or release_page is null or draft_page<1 or release_page<1 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 select count(*) into drafts_total from public.content_drafts d where not exists(select 1 from private.content_record_deletions x where x.kind='draft' and x.record_id=d.id);
 select count(*) into releases_total from public.content_releases r where not exists(select 1 from private.content_record_deletions x where x.kind='release' and x.record_id=r.id);
 dp:=least(draft_page,greatest(1,ceil(drafts_total/10.0)::integer));
 rp:=least(release_page,greatest(1,ceil(releases_total/10.0)::integer));
 select coalesce(jsonb_agg(row order by row."updatedAt" desc,row.id desc),'[]'::jsonb) into drafts from (
  select d.id,d.version,d.status,d.created_at as "createdAt",d.updated_at as "updatedAt",m.name,
   (select c.summary from private.content_draft_changes c where c.draft_id=d.id order by c.version desc limit 1) as summary
  from public.content_drafts d left join private.content_draft_details m on m.draft_id=d.id
  where not exists(select 1 from private.content_record_deletions x where x.kind='draft' and x.record_id=d.id)
  order by d.updated_at desc,d.id desc limit 10 offset (dp-1)::bigint*10
 ) row;
 select coalesce(jsonb_agg(row order by row."createdAt" desc,row.id desc),'[]'::jsonb) into releases from (
  select r.id,r.draft_id as "draftId",r.draft_version as "draftVersion",r.rollback_of as "rollbackOf",r.created_at as "createdAt"
  from public.content_releases r where not exists(select 1 from private.content_record_deletions x where x.kind='release' and x.record_id=r.id)
  order by r.created_at desc,r.id desc limit 10 offset (rp-1)::bigint*10
 ) row;
 return jsonb_build_object('drafts',drafts,'releases',releases,'publishedReleaseId',(select release_id from public.content_publication where singleton),
 'draftPagination',jsonb_build_object('page',dp,'total',drafts_total,'totalPages',greatest(1,ceil(drafts_total/10.0)::integer)),
 'releasePagination',jsonb_build_object('page',rp,'total',releases_total,'totalPages',greatest(1,ceil(releases_total/10.0)::integer)));
end$$;
create or replace function public.get_content_workspace() returns jsonb
language sql stable security definer set search_path='' as $$select public.get_paginated_content_workspace(1,1)$$;
revoke all on function public.delete_content_record(text,uuid,integer),public.get_paginated_content_workspace(integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.delete_content_record(text,uuid,integer),public.get_paginated_content_workspace(integer,integer) to authenticated;
-- A small public version pointer; no drafts, identities or private media are exposed.
create function public.get_published_content_revision() returns uuid
language sql stable security definer set search_path='' as $$select release_id from public.content_publication where singleton$$;
revoke all on function public.get_published_content_revision() from public,anon,authenticated,service_role;
grant execute on function public.get_published_content_revision() to anon,authenticated,service_role;
commit;
