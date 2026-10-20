-- A single atomic counter is shared by both applications. Never expose raw IPs.
create table private.request_limits (
  scope text not null check (scope in ('signin','write')),
  subject_hash text not null check (subject_hash ~ '^[a-f0-9]{64}$'),
  attempts integer not null check (attempts > 0),
  expires_at timestamptz not null,
  primary key(scope, subject_hash)
);
create index request_limits_expiry_idx on private.request_limits(expires_at);
alter table private.request_limits enable row level security;
revoke all on private.request_limits from public, anon, authenticated, service_role;

-- The definer owns only the fixed scope policy; callers cannot choose limits/windows.
-- Only verified application servers hold the service key. Browser JWTs cannot call this RPC.
create function public.consume_request_limit(scope text, subject_hash text)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = ''
as $$
declare
  max_attempts integer;
  window_size interval;
  counter private.request_limits%rowtype;
  request_time timestamptz := clock_timestamp();
begin
  if scope not in ('signin','write') or scope is null or subject_hash is null or subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid limit request' using errcode = '22023';
  end if;
  max_attempts := case scope when 'signin' then 10 else 60 end;
  window_size := case scope when 'signin' then interval '15 minutes' else interval '1 minute' end;
  insert into private.request_limits as limits(scope, subject_hash, attempts, expires_at)
  values (scope, subject_hash, 1, request_time + window_size)
  on conflict on constraint request_limits_pkey do update
  set attempts = case when limits.expires_at <= request_time then 1 else least(limits.attempts + 1, max_attempts + 1) end,
      expires_at = case when limits.expires_at <= request_time then request_time + window_size else limits.expires_at end
  returning * into counter;
  return query select counter.attempts <= max_attempts,
    case when counter.attempts <= max_attempts then 0 else greatest(1,ceil(extract(epoch from counter.expires_at-request_time))::integer) end;
end;
$$;
revoke all on function public.consume_request_limit(text,text) from public, anon, authenticated, service_role;
grant execute on function public.consume_request_limit(text,text) to service_role;

-- Idle traffic does not preserve IP digests indefinitely. Every 15 minutes remove
-- expired buckets; with a maximum 15-minute window retention is at most 30 minutes.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('purge-request-limits','*/15 * * * *',
  $job$delete from private.request_limits where expires_at <= now()$job$);
