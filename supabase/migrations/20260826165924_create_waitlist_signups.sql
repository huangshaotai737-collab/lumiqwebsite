create extension if not exists pgcrypto;

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'prelaunch',
  consent_version text not null default 'waitlist-v1',
  created_at timestamptz not null default now(),
  constraint waitlist_email_normalized check (email = lower(btrim(email))),
  constraint waitlist_email_length check (char_length(email) between 3 and 254)
);

alter table public.waitlist_signups enable row level security;

revoke all on table public.waitlist_signups from public;
revoke all on table public.waitlist_signups from anon, authenticated;
grant insert on table public.waitlist_signups to service_role;

comment on table public.waitlist_signups is
  'Prelaunch email registrations submitted through the server-only waitlist endpoint.';
