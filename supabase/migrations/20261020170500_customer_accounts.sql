-- Append-only scope extension; callers still cannot choose limits or windows.
alter table private.request_limits drop constraint request_limits_scope_check;
alter table private.request_limits add constraint request_limits_scope_check check(scope in ('signin','write','register','reset'));
create or replace function public.consume_request_limit(scope text, subject_hash text)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql security definer set search_path = ''
as $$
declare
  max_attempts integer;
  window_size interval;
  counter private.request_limits%rowtype;
  request_time timestamptz := clock_timestamp();
begin
  if scope not in ('signin','write','register','reset') or scope is null or subject_hash is null or subject_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid limit request' using errcode = '22023';
  end if;
  max_attempts := case scope when 'signin' then 10 when 'register' then 5 when 'reset' then 5 else 60 end;
  window_size := case when scope in ('signin','register','reset') then interval '15 minutes' else interval '1 minute' end;
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
