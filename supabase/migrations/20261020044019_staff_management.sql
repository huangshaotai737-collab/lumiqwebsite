-- Team mutations serialize on one transaction lock, including bootstrap and acceptance.
create table public.staff_invites (
 id uuid primary key default gen_random_uuid(),
 email text not null check (email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' and length(email)<=254),
 role text not null check(role in ('admin','editor','operations')),
 token_digest text not null check(token_digest ~ '^[a-f0-9]{64}$'),
 created_by uuid not null,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '48 hours'),
 delivered_at timestamptz,
 accepted_at timestamptz,
 accepted_by uuid,
 revoked_at timestamptz
);
create index staff_invites_email_idx on public.staff_invites(email);
alter table public.staff_invites enable row level security;
revoke all on public.staff_invites from public,anon,authenticated,service_role;
-- No client, including an administrator, can retrieve the token digest.
grant select(id,email,role,created_by,created_at,expires_at,delivered_at,accepted_at,accepted_by,revoked_at) on public.staff_invites to authenticated;
create policy invites_read_admin on public.staff_invites for select to authenticated using ((select private.current_staff_role())='admin');
create policy audit_read_own_category on public.audit_events for select to authenticated using (
 actor_id=(select auth.uid()) and (
 ((select private.current_staff_role())='editor' and (action like 'content.%' or action like 'media.%')) or
 ((select private.current_staff_role())='operations' and (action like 'waitlist.%' or action like 'orders.%' or action like 'customers.%'))
 ));

create function public.bootstrap_staff_admin(email text) returns uuid
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 if exists(select 1 from public.staff_memberships where role='admin') then raise exception 'CONFLICT' using errcode='23505'; end if;
 select u.id into target from auth.users u join public.profiles p on p.user_id=u.id
 where lower(u.email)=lower(btrim(bootstrap_staff_admin.email)) and u.email_confirmed_at is not null and not u.is_anonymous and p.access_state='active';
 if target is null then raise exception 'CONFIRMED_ACCOUNT_REQUIRED' using errcode='22023'; end if;
 insert into public.staff_memberships(user_id,role,active) values(target,'admin',true);
 perform private.append_audit('team.bootstrap','staff',target,'{"role":"admin","active":true}'::jsonb);
 return target;
end$$;
revoke all on function public.bootstrap_staff_admin(text) from public,anon,authenticated,service_role;
grant execute on function public.bootstrap_staff_admin(text) to service_role;

create function public.create_staff_invite(email text, role text, token_digest text) returns uuid
language plpgsql security definer set search_path='' as $$
declare invitation uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin']);
 if exists(select 1 from auth.users u join public.staff_memberships s on s.user_id=u.id where lower(u.email)=lower(btrim(create_staff_invite.email))) then raise exception 'CONFLICT' using errcode='23505'; end if;
 update public.staff_invites set revoked_at=now() where staff_invites.email=lower(btrim(create_staff_invite.email)) and accepted_at is null and revoked_at is null;
 insert into public.staff_invites(email,role,token_digest,created_by)
 values(lower(btrim(create_staff_invite.email)),create_staff_invite.role,create_staff_invite.token_digest,auth.uid()) returning id into invitation;
 perform private.append_audit('team.invited','staff_invite',invitation,jsonb_build_object('role',create_staff_invite.role));
 return invitation;
end$$;

create function public.mark_staff_invite_delivery(invite_id uuid, delivered boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin']);
 update public.staff_invites set delivered_at=case when delivered then now() else null end, revoked_at=case when delivered then revoked_at else now() end
 where id=invite_id and created_by=auth.uid() and accepted_at is null and revoked_at is null;
 if not found then raise exception 'CONFLICT' using errcode='23505'; end if;
 perform private.append_audit(case when delivered then 'team.invite_sent' else 'team.invite_failed' end,'staff_invite',invite_id,'{}');
end$$;

create function public.accept_staff_invite(invite_id uuid, token_digest text) returns void
language plpgsql security definer set search_path='' as $$
declare invitation public.staff_invites%rowtype; identity_email text;
begin
 perform pg_advisory_xact_lock(7410404);
 select * into invitation from public.staff_invites where id=invite_id for update;
 if not found or invitation.token_digest<>accept_staff_invite.token_digest or accept_staff_invite.token_digest is null or invitation.accepted_at is not null or invitation.revoked_at is not null or invitation.delivered_at is null or invitation.expires_at<=now() then raise exception 'INVITE_INVALID' using errcode='23505'; end if;
 select lower(u.email) into identity_email from auth.users u join public.profiles p on p.user_id=u.id
 where u.id=auth.uid() and u.email_confirmed_at is not null and not u.is_anonymous and p.access_state='active';
 if identity_email is null or identity_email<>invitation.email then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if exists(select 1 from public.staff_memberships where user_id=auth.uid()) then raise exception 'CONFLICT' using errcode='23505'; end if;
 insert into public.staff_memberships(user_id,role) values(auth.uid(),invitation.role);
 update public.staff_invites set accepted_at=now(),accepted_by=auth.uid() where id=invite_id;
 perform private.append_audit('team.accepted','staff_invite',invite_id,jsonb_build_object('role',invitation.role));
end$$;

create function public.change_staff_membership(user_id uuid, role text, active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.staff_memberships%rowtype;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin']);
 if change_staff_membership.role is null or change_staff_membership.role not in ('admin','editor','operations') or change_staff_membership.active is null then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 select * into previous from public.staff_memberships s where s.user_id=change_staff_membership.user_id for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if previous.role='admin' and previous.active and (change_staff_membership.role<>'admin' or not change_staff_membership.active)
 and not exists(select 1 from public.staff_memberships s join public.profiles p using(user_id) where s.user_id<>previous.user_id and s.role='admin' and s.active and p.access_state='active') then raise exception 'LAST_ADMIN' using errcode='23505'; end if;
 update public.staff_memberships s set role=change_staff_membership.role,active=change_staff_membership.active where s.user_id=change_staff_membership.user_id;
 perform private.append_audit('team.changed','staff',previous.user_id,jsonb_build_object('before',jsonb_build_object('role',previous.role,'active',previous.active),'after',jsonb_build_object('role',change_staff_membership.role,'active',change_staff_membership.active)));
end$$;

create function public.list_staff() returns table(user_id uuid,email text,role text,active boolean)
language plpgsql security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin']);
 return query select s.user_id,u.email::text,s.role,s.active from public.staff_memberships s join auth.users u on u.id=s.user_id order by u.email;
end$$;
revoke all on function public.create_staff_invite(text,text,text),public.mark_staff_invite_delivery(uuid,boolean),public.accept_staff_invite(uuid,text),public.change_staff_membership(uuid,text,boolean),public.list_staff() from public,anon,authenticated,service_role;
grant execute on function public.create_staff_invite(text,text,text),public.mark_staff_invite_delivery(uuid,boolean),public.accept_staff_invite(uuid,text),public.change_staff_membership(uuid,text,boolean),public.list_staff() to authenticated;
