-- Authorization is always derived from current database rows, never JWT metadata.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;
alter default privileges in schema private revoke execute on functions from public;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 120),
  locale text not null default 'en' check (locale in ('en', 'zh-hant', 'ja')),
  shipping_address jsonb not null default '{}'::jsonb check (jsonb_typeof(shipping_address) = 'object'),
  access_state text not null default 'active' check (access_state in ('active', 'suspended', 'anonymized'))
);
create table public.staff_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'editor', 'operations')),
  active boolean not null default true
);
create index staff_memberships_role_active_idx on public.staff_memberships(role, active);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  -- Kept as an immutable reference even if the Auth identity is later removed.
  actor_id uuid,
  action text not null check (char_length(action) between 1 and 120),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid not null,
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object'),
  created_at timestamptz not null default now()
);
create index audit_events_actor_created_idx on public.audit_events(actor_id, created_at desc);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id);

alter table public.profiles enable row level security;
alter table public.staff_memberships enable row level security;
alter table public.audit_events enable row level security;
revoke all on public.profiles, public.staff_memberships, public.audit_events from public, anon, authenticated, service_role;
grant select on public.profiles, public.staff_memberships, public.audit_events to authenticated;
grant update(display_name, locale, shipping_address) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles, public.staff_memberships to service_role;

-- Definer is needed only for the internal RLS lookup; callers cannot supply a user ID.
create function private.current_profile_is_active() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p where p.user_id = (select auth.uid()) and p.access_state = 'active');
$$;
create function private.current_staff_role() returns text
language sql stable security definer set search_path = ''
as $$
  select s.role from public.staff_memberships s
  join public.profiles p using (user_id)
  where s.user_id = (select auth.uid()) and s.active and p.access_state = 'active';
$$;
create function private.assert_staff_role(allowed text[]) returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not coalesce(private.current_staff_role() = any(allowed), false) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.current_profile_is_active(), private.current_staff_role(), private.assert_staff_role(text[]) from public, anon, authenticated, service_role;
grant execute on function private.current_profile_is_active(), private.current_staff_role(), private.assert_staff_role(text[]) to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated
using (user_id = (select auth.uid()));
create policy profiles_update_active_self on public.profiles for update to authenticated
using (user_id = (select auth.uid()) and (select private.current_profile_is_active()))
with check (user_id = (select auth.uid()) and access_state = 'active');
create policy staff_read_self on public.staff_memberships for select to authenticated
using (user_id = (select auth.uid()));
-- A4 adds category-limited reads for editors and operations. Default deny until then.
create policy audit_read_admin on public.audit_events for select to authenticated
using ((select private.current_staff_role()) = 'admin');

create function private.initialize_profile() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.initialize_profile() from public, anon, authenticated, service_role;
create trigger auth_user_initialize_profile after insert on auth.users
for each row execute function private.initialize_profile();
-- Existing Auth accounts become ordinary members. No metadata is copied as authority.
insert into public.profiles(user_id) select id from auth.users on conflict (user_id) do nothing;

-- Only postgres-owned, separately authorized business routines may invoke this helper.
-- SECURITY INVOKER intentionally preserves their existing transaction and privileges.
-- Customer order routines may audit ordinary customer actors; staff is not required here.
create function private.append_audit(action text, entity_type text, entity_id uuid, summary jsonb) returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null and action <> 'team.bootstrap' and action not like 'system.%' then
    raise exception 'audit actor required' using errcode = '42501';
  end if;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, summary)
  values (actor, action, entity_type, entity_id, summary);
end;
$$;
revoke all on function private.append_audit(text, text, uuid, jsonb) from public, anon, authenticated, service_role;

create function private.reject_audit_mutation() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  raise exception 'audit events are append-only' using errcode = '55000';
end;
$$;
revoke all on function private.reject_audit_mutation() from public, anon, authenticated, service_role;
create trigger audit_events_no_update_delete before update or delete on public.audit_events
for each row execute function private.reject_audit_mutation();
create trigger audit_events_no_truncate before truncate on public.audit_events
for each statement execute function private.reject_audit_mutation();

comment on function private.append_audit(text, text, uuid, jsonb) is
  'Trusted SQL routines only. Caller must authorize actor/object and supply a minimal non-secret summary in the same transaction. Null actors limited to team.bootstrap or system.* actions.';
