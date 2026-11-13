begin;
alter function public.get_admin_dashboard() set schema private;
revoke all on function private.get_admin_dashboard() from public,anon,authenticated,service_role;
create function public.get_admin_dashboard() returns jsonb
language plpgsql security definer set search_path='' as $$
declare dashboard jsonb;
begin
 dashboard:=private.get_admin_dashboard();
 if dashboard->'drafts'<>'null'::jsonb then
  dashboard:=jsonb_set(dashboard,'{drafts}',to_jsonb((select count(*) from public.content_drafts d
   where d.status in ('editing','submitted') and not exists(select 1 from private.content_record_deletions x where x.kind='draft' and x.record_id=d.id))));
 end if;
 return dashboard;
end$$;
revoke all on function public.get_admin_dashboard() from public,anon,authenticated,service_role;
grant execute on function public.get_admin_dashboard() to authenticated;
commit;
