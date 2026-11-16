-- Additive draft metadata. Existing content, releases and publication RPCs stay intact.
begin;
create table private.content_draft_details (
 draft_id uuid primary key references public.content_drafts(id) on delete cascade,
 name text not null check (char_length(btrim(name)) between 1 and 100)
);
create table private.content_draft_changes (
 draft_id uuid not null references public.content_drafts(id) on delete cascade,
 version integer not null check (version > 0),
 name text not null check (char_length(btrim(name)) between 1 and 100),
 summary text not null check (char_length(btrim(summary)) between 1 and 240),
 saved_at timestamptz not null,
 saved_by uuid not null,
 primary key(draft_id, version)
);
alter table private.content_draft_details enable row level security;
alter table private.content_draft_changes enable row level security;
revoke all on private.content_draft_details,private.content_draft_changes from public,anon,authenticated,service_role;

-- The underlying save retains the existing authorization lock, version check,
-- schema validation and asset rules. Metadata and snapshot commit together.
create function public.save_described_content_draft(id uuid, expected_version integer, snapshot jsonb, draft_name text, change_summary text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved jsonb; changed_at timestamptz;
begin
 perform private.assert_staff_role(array['admin','editor']);
 if draft_name is null or char_length(btrim(draft_name)) not between 1 and 100 or change_summary is null or char_length(btrim(change_summary)) not between 1 and 240 then
  raise exception 'INVALID_INPUT' using errcode='22023';
 end if;
 saved := public.save_content_draft(id,expected_version,snapshot);
 insert into private.content_draft_details(draft_id,name) values(id,btrim(draft_name))
 on conflict(draft_id) do update set name=excluded.name;
 select d.updated_at into changed_at from public.content_drafts d where d.id=save_described_content_draft.id;
 insert into private.content_draft_changes(draft_id,version,name,summary,saved_at,saved_by)
 values(id,(saved->>'version')::integer,btrim(draft_name),btrim(change_summary),changed_at,auth.uid());
 return saved || jsonb_build_object('updatedAt',changed_at);
end$$;

create function public.get_described_content_draft(id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare draft jsonb;
begin
 draft := public.get_content_draft(id);
 if draft is null then return null; end if;
 return draft || jsonb_build_object(
  'createdAt',(select d.created_at from public.content_drafts d where d.id=get_described_content_draft.id),
  'name',(select m.name from private.content_draft_details m where m.draft_id=id),
  'summary',(select c.summary from private.content_draft_changes c where c.draft_id=id order by c.version desc limit 1),
  'changes',coalesce((select jsonb_agg(row order by row.version desc) from (
   select c.version,c.name,c.summary,c.saved_at as "savedAt" from private.content_draft_changes c where c.draft_id=id order by c.version desc limit 50
  ) row),'[]'::jsonb));
end$$;

create function public.get_described_content_workspace() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare workspace jsonb;
begin
 workspace := public.get_content_workspace();
 return workspace || jsonb_build_object('drafts',coalesce((
  select jsonb_agg(item || jsonb_build_object('name',m.name,'createdAt',d.created_at,'summary',(
   select c.summary from private.content_draft_changes c where c.draft_id=d.id order by c.version desc limit 1
  )) order by d.updated_at desc,d.id desc)
  from jsonb_array_elements(workspace->'drafts') item
  join public.content_drafts d on d.id=(item->>'id')::uuid
  left join private.content_draft_details m on m.draft_id=d.id
 ),'[]'::jsonb));
end$$;
revoke all on function public.save_described_content_draft(uuid,integer,jsonb,text,text),public.get_described_content_draft(uuid),public.get_described_content_workspace() from public,anon,authenticated,service_role;
grant execute on function public.save_described_content_draft(uuid,integer,jsonb,text,text),public.get_described_content_draft(uuid),public.get_described_content_workspace() to authenticated;
commit;
