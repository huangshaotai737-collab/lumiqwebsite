-- Only a reviewed owner migration may confirm retention scope. No client/server toggle.
create table private.customer_privacy_policy (
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 revision text,
 check(not enabled or (revision is not null and btrim(revision)<>''))
);
insert into private.customer_privacy_policy(singleton) values(true);
alter table private.customer_privacy_policy enable row level security;
revoke all on private.customer_privacy_policy from public,anon,authenticated,service_role;
create table public.customer_privacy_jobs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references public.profiles(user_id),
 initiated_by uuid not null,
 policy_revision text not null,
 reason text not null check(reason in ('customer_request','retention_expired')),
 status text not null default 'pending' check(status in ('pending','failed','completed')),
 auth_banned boolean not null default false,
 auth_cleared boolean not null default false,
 failure_step text check(failure_step in ('auth_ban','auth_contact','application')),
 attempts integer not null default 0,
 lease_token uuid,
 lease_until timestamptz,
 acting_admin uuid,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 completed_at timestamptz
);
alter table public.customer_privacy_jobs enable row level security;
revoke all on public.customer_privacy_jobs from public,anon,authenticated,service_role;
create function private.privacy_policy_revision() returns text language plpgsql security definer set search_path='' as $$
declare revision text;begin
 select p.revision into revision from private.customer_privacy_policy p where p.singleton and p.enabled for share;
 if revision is null then raise exception 'RETENTION_NOT_CONFIRMED' using errcode='42501'; end if;return revision;
end;$$;
create function private.privacy_admin(actor uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.staff_memberships s join public.profiles p using(user_id) where s.user_id=actor and s.role='admin' and s.active and p.access_state='active') then raise exception 'FORBIDDEN' using errcode='42501';end if;
end;$$;
-- Invoker sees OLD after PostgreSQL row-lock recheck, unlike a statement-snapshot RLS helper.
create function private.guard_profile_personal_update() returns trigger language plpgsql set search_path='' as $$
begin
 if current_user='authenticated' and old.access_state<>'active' then raise exception 'FORBIDDEN' using errcode='42501';end if;
 return new;
end;$$;
create trigger profiles_current_row_guard before update on public.profiles for each row execute function private.guard_profile_personal_update();
create function public.request_customer_anonymization(user_id uuid,reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare revision text; job public.customer_privacy_jobs%rowtype;
begin
 perform pg_advisory_xact_lock(7410404);perform private.assert_staff_role(array['admin']);
 revision:=private.privacy_policy_revision();
 if reason is null or reason not in ('customer_request','retention_expired') then raise exception 'invalid reason' using errcode='22023';end if;
 if exists(select 1 from public.staff_memberships s where s.user_id=request_customer_anonymization.user_id) then raise exception 'staff target forbidden' using errcode='42501';end if;
 -- Same lock order as create_customer_order: Auth then profile. Existing orders finish before suspension.
 perform 1 from auth.users u where u.id=user_id for update;
 if not found then raise exception 'not found' using errcode='P0002';end if;
 perform 1 from public.profiles p where p.user_id=request_customer_anonymization.user_id for update;
 select * into job from public.customer_privacy_jobs j where j.user_id=request_customer_anonymization.user_id;
 if found then
  if job.policy_revision<>revision then raise exception 'policy changed' using errcode='42501';end if;
  return jsonb_build_object('jobId',job.id,'status',job.status);
 end if;
 update public.profiles p set access_state='suspended' where p.user_id=request_customer_anonymization.user_id;
 insert into public.customer_privacy_jobs(user_id,initiated_by,policy_revision,reason) values(user_id,auth.uid(),revision,reason) returning * into job;
 perform private.append_audit('customers.anonymization_requested','customer_privacy_job',job.id,jsonb_build_object('userId',user_id,'reasonCode',reason,'policyRevision',revision));
 return jsonb_build_object('jobId',job.id,'status',job.status);
end;$$;
create function public.claim_customer_privacy_job(job_id uuid,actor_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.customer_privacy_jobs%rowtype;revision text;token uuid:=gen_random_uuid();
begin
 perform pg_advisory_xact_lock(7410404);perform private.privacy_admin(actor_id);revision:=private.privacy_policy_revision();
 select * into job from public.customer_privacy_jobs j where j.id=job_id for update;
 if not found then raise exception 'not found' using errcode='P0002';end if;
 if job.policy_revision<>revision or exists(select 1 from public.staff_memberships s where s.user_id=job.user_id) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 if job.status='completed' then return jsonb_build_object('status','completed');end if;
 if job.lease_until>clock_timestamp() then raise exception 'already running' using errcode='23505';end if;
 if not exists(select 1 from public.profiles p where p.user_id=job.user_id and p.access_state='suspended') then raise exception 'FORBIDDEN' using errcode='42501';end if;
 update public.customer_privacy_jobs set status='pending',failure_step=null,attempts=attempts+1,lease_token=token,lease_until=clock_timestamp()+interval '5 minutes',acting_admin=actor_id,updated_at=now() where id=job_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,summary) values(actor_id,'customers.anonymization_resumed','customer_privacy_job',job_id,jsonb_build_object('attempt',job.attempts+1));
 return jsonb_build_object('userId',job.user_id,'leaseToken',token,'status','pending');
end;$$;
create function private.lock_privacy_claim(job_id uuid,token uuid) returns public.customer_privacy_jobs language plpgsql security definer set search_path='' as $$
declare job public.customer_privacy_jobs%rowtype;revision text;begin
 perform pg_advisory_xact_lock(7410404);revision:=private.privacy_policy_revision();
 select * into job from public.customer_privacy_jobs j where j.id=job_id for update;
 if not found or job.lease_token is distinct from token or token is null or job.lease_until<=clock_timestamp() or job.status<>'pending' then raise exception 'stale claim' using errcode='23505';end if;
 perform private.privacy_admin(job.acting_admin);
 if job.policy_revision<>revision or exists(select 1 from public.staff_memberships s where s.user_id=job.user_id) then raise exception 'FORBIDDEN' using errcode='42501';end if;
 return job;
end;$$;
create function public.checkpoint_customer_privacy_auth(job_id uuid,token uuid,step text) returns void language plpgsql security definer set search_path='' as $$
declare job public.customer_privacy_jobs%rowtype;u auth.users%rowtype;begin
 job:=private.lock_privacy_claim(job_id,token);select * into u from auth.users where id=job.user_id for share;
 if u.banned_until is null or u.banned_until<now()+interval '90 years' then raise exception 'Auth ban not verified' using errcode='23514';end if;
 if step='auth_contact' then
  if u.email is distinct from 'erased-'||job.user_id||'@example.invalid' or coalesce(u.phone,'')<>'' or coalesce(u.email_change,'')<>'' or coalesce(u.phone_change,'')<>'' or exists(select 1 from auth.mfa_factors f where f.user_id=job.user_id) or (coalesce(u.raw_user_meta_data,'{}')-'email_verified')<>'{}'::jsonb or (coalesce(u.raw_app_meta_data,'{}')-'provider'-'providers')<>'{}'::jsonb
   or (u.raw_user_meta_data ? 'email_verified' and jsonb_typeof(u.raw_user_meta_data->'email_verified')<>'boolean') or (u.raw_app_meta_data ? 'provider' and u.raw_app_meta_data->>'provider'<>'email') or (u.raw_app_meta_data ? 'providers' and u.raw_app_meta_data->'providers'<>'["email"]'::jsonb)
   or exists(select 1 from auth.identities i where i.user_id=job.user_id and (i.provider<>'email' or (i.identity_data-'sub'-'email'-'email_verified'-'phone_verified')<>'{}'::jsonb or i.identity_data->>'email' is distinct from u.email or i.identity_data->>'sub' is distinct from job.user_id::text or (i.identity_data ? 'email_verified' and jsonb_typeof(i.identity_data->'email_verified')<>'boolean') or (i.identity_data ? 'phone_verified' and jsonb_typeof(i.identity_data->'phone_verified')<>'boolean'))) then raise exception 'Auth contact not verified' using errcode='23514';end if;
 elsif step<>'auth_ban' or step is null then raise exception 'invalid step' using errcode='22023';end if;
 update public.customer_privacy_jobs set auth_banned=true,auth_cleared=auth_cleared or step='auth_contact',updated_at=now() where id=job_id;
end;$$;
create function public.fail_customer_privacy_job(job_id uuid,token uuid,failure_step text) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.customer_privacy_jobs%rowtype;begin
 -- Failure recording is non-erasing and remains possible after policy/actor revocation.
 perform pg_advisory_xact_lock(7410404);
 select * into job from public.customer_privacy_jobs j where j.id=job_id for update;
 if not found or job.lease_token is distinct from token or token is null or job.status<>'pending' then raise exception 'stale claim' using errcode='23505';end if;
 if failure_step is null or failure_step not in ('auth_ban','auth_contact','application') then raise exception 'invalid step' using errcode='22023';end if;
 update public.customer_privacy_jobs j set status='failed',failure_step=fail_customer_privacy_job.failure_step,lease_token=null,lease_until=null,updated_at=now() where j.id=job_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,summary) values(job.acting_admin,'customers.anonymization_failed','customer_privacy_job',job_id,jsonb_build_object('step',failure_step));
 return jsonb_build_object('status','failed');
end;$$;
create function public.anonymize_customer_data(job_id uuid,token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare job public.customer_privacy_jobs%rowtype;begin
 job:=private.lock_privacy_claim(job_id,token);
 -- Verify current Auth rows again, never trust a browser boolean or an earlier checkpoint alone.
 perform public.checkpoint_customer_privacy_auth(job_id,token,'auth_contact');
 perform 1 from public.profiles p where p.user_id=job.user_id and p.access_state='suspended' for update;
 if not found then raise exception 'FORBIDDEN' using errcode='42501';end if;
 update public.profiles set display_name='',locale='en',shipping_address='{}',access_state='anonymized' where user_id=job.user_id;
 -- Owner-only RPC has fixed scope; existing client/service grants stay closed. Financial snapshots untouched.
 update public.customer_orders set shipping_address='{}' where user_id=job.user_id;
 delete from public.customer_notes where user_id=job.user_id;
 delete from public.order_notes n using public.customer_orders o where n.order_id=o.id and o.user_id=job.user_id;
 update public.customer_privacy_jobs set status='completed',failure_step=null,lease_token=null,lease_until=null,updated_at=now(),completed_at=now() where id=job_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,summary) values(job.acting_admin,'customers.anonymization_completed','customer_privacy_job',job_id,jsonb_build_object('userId',job.user_id,'policyRevision',job.policy_revision));
 return jsonb_build_object('status','completed');
end;$$;
create function public.get_customer_privacy_workspace(search text default '',page integer default 1,page_size integer default 25) returns jsonb language plpgsql security definer set search_path='' as $$
declare response jsonb;begin
 perform private.assert_staff_role(array['admin']);
 if search is null or length(search)>36 or page is null or page<1 or page>1000000 or page_size is null or page_size<1 or page_size>100 then raise exception 'invalid query' using errcode='22023';end if;
 with matching as(select * from public.customer_privacy_jobs j where search='' or strpos(j.id::text,search)>0 or strpos(j.user_id::text,search)>0),sliced as(select * from matching order by created_at desc,id desc limit page_size offset (page::bigint-1)*page_size)
 select jsonb_build_object('enabled',coalesce((select enabled and revision is not null from private.customer_privacy_policy where singleton),false),'jobs',jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'userId',user_id,'status',status,'authBanned',auth_banned,'authCleared',auth_cleared,'failureStep',failure_step,'attempts',attempts,'createdAt',created_at,'leaseUntil',lease_until) order by created_at desc,id desc) from sliced),'[]'::jsonb),'total',(select count(*) from matching),'page',page,'pageSize',page_size)) into response;return response;
end;$$;
-- Prevent any new private note after suspension, including after completion.
create function private.guard_customer_private_note() returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;begin
 perform pg_advisory_xact_lock(7410404);
 if tg_table_name='customer_notes' then target:=new.user_id;else select user_id into target from public.customer_orders where id=new.order_id;end if;
 if not exists(select 1 from public.profiles p where p.user_id=target and p.access_state='active') then raise exception 'FORBIDDEN' using errcode='42501';end if;return new;
end;$$;
create trigger customer_notes_active_target before insert or update on public.customer_notes for each row execute function private.guard_customer_private_note();
create trigger order_notes_active_target before insert or update on public.order_notes for each row execute function private.guard_customer_private_note();
create function public.get_admin_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$
declare role text;events jsonb;begin
 perform private.assert_staff_role(array['admin','editor','operations']);role:=private.current_staff_role();
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'action',action,'entityType',entity_type,'entityId',entity_id,'createdAt',created_at) order by created_at desc,id desc),'[]') into events from (select * from public.audit_events a where role='admin' or (a.actor_id=auth.uid() and ((role='editor' and (a.action like 'content.%' or a.action like 'media.%')) or (role='operations' and (a.action like 'customers.%' or a.action like 'orders.%' or a.action like 'waitlist.%')))) order by created_at desc,id desc limit 10) a;
 return jsonb_build_object('customers',case when role in ('admin','operations') then(select count(*) from public.profiles p join auth.users u on u.id=p.user_id where p.access_state<>'anonymized' and not u.is_anonymous and not exists(select 1 from public.staff_memberships s where s.user_id=p.user_id)) else null end,'waitlist',case when role in ('admin','operations') then(select count(*) from public.waitlist_signups) else null end,'orders',case when role in ('admin','operations') then(select count(*) from public.customer_orders) else null end,'drafts',case when role in ('admin','editor') then(select count(*) from public.content_drafts where status='draft') else null end,'recentAudit',events);
end;$$;
revoke all on function private.privacy_policy_revision(),private.privacy_admin(uuid),private.guard_profile_personal_update(),private.lock_privacy_claim(uuid,uuid),private.guard_customer_private_note() from public,anon,authenticated,service_role;
revoke all on function public.request_customer_anonymization(uuid,text),public.get_customer_privacy_workspace(text,integer,integer),public.get_admin_dashboard(),public.claim_customer_privacy_job(uuid,uuid),public.checkpoint_customer_privacy_auth(uuid,uuid,text),public.fail_customer_privacy_job(uuid,uuid,text),public.anonymize_customer_data(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.request_customer_anonymization(uuid,text),public.get_customer_privacy_workspace(text,integer,integer),public.get_admin_dashboard() to authenticated;
grant execute on function public.claim_customer_privacy_job(uuid,uuid),public.checkpoint_customer_privacy_auth(uuid,uuid,text),public.fail_customer_privacy_job(uuid,uuid,text),public.anonymize_customer_data(uuid,uuid) to service_role;
-- Suspension immediately hides private profile fields even from an existing customer JWT.
alter policy profiles_read_self on public.profiles using(user_id=(select auth.uid()) and access_state='active');
