-- A removal is an audited release based on the exact publication confirmed.
-- Original files and immutable historical releases remain available for recovery.
create or replace function public.publish_media_removal(draft_id uuid, expected_version integer, expected_release uuid, usage_key text) returns uuid
language plpgsql security definer set search_path='' as $$
declare current_release uuid; baseline jsonb; draft public.content_drafts%rowtype; new_release uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 perform pg_advisory_xact_lock(7410606);
 perform private.assert_staff_role(array['admin']);
 select p.release_id,r.snapshot into current_release,baseline
 from public.content_publication p join public.content_releases r on r.id=p.release_id where p.singleton;
 if current_release is distinct from expected_release then raise exception 'CONFLICT' using errcode='23505'; end if;
 if baseline->'media'->usage_key->>'kind' is distinct from 'image' or baseline->'media'->usage_key->>'hidden'='true' then
  raise exception 'INVALID_INPUT' using errcode='22023';
 end if;
 select * into draft from public.content_drafts d where d.id=draft_id for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if draft.version is distinct from expected_version then raise exception 'CONFLICT' using errcode='23505'; end if;
 if draft.snapshot is distinct from jsonb_set(baseline,array['media',usage_key,'hidden'],'true'::jsonb) then
  raise exception 'REMOVAL_MUST_ONLY_CHANGE_SELECTED_IMAGE' using errcode='22023';
 end if;
 new_release:=public.publish_content_draft(draft_id,expected_version);
 perform private.append_audit('content.image_removed','content_release',new_release,jsonb_build_object('usageKey',usage_key,'previousReleaseId',current_release));
 return new_release;
end$$;
revoke all on function public.publish_media_removal(uuid,integer,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.publish_media_removal(uuid,integer,uuid,text) to authenticated;
