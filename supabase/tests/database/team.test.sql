begin;
select plan(31);
select has_table('public','staff_invites','staff invitations exist');
select has_function('public','change_staff_membership',array['uuid','text','boolean'],'transactional role management exists');
insert into auth.users(id,email,email_confirmed_at) values
 ('40000000-0000-4000-8000-000000000001','team-admin@example.test',now()),
 ('40000000-0000-4000-8000-000000000002','team-editor@example.test',now()),
 ('40000000-0000-4000-8000-000000000003','team-member@example.test',now()),
 ('40000000-0000-4000-8000-000000000004','team-other@example.test',now()),
 ('40000000-0000-4000-8000-000000000005','team-unconfirmed@example.test',null);
select lives_ok($$select public.bootstrap_staff_admin('team-admin@example.test')$$,'first admin bootstrap succeeds');
select throws_ok($$select public.bootstrap_staff_admin('team-other@example.test')$$,'23505','CONFLICT','repeat bootstrap refused');
insert into public.staff_memberships(user_id,role) values('40000000-0000-4000-8000-000000000002','editor');
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.change_staff_membership('40000000-0000-4000-8000-000000000001','editor',true)$$,'23505','LAST_ADMIN','last admin cannot demote');
select throws_ok($$select public.change_staff_membership('40000000-0000-4000-8000-000000000001','admin',false)$$,'23505','LAST_ADMIN','last admin cannot deactivate');
select public.create_staff_invite('team-member@example.test','operations',repeat('a',64)) as invite_id \gset
select is((select count(*)::int from public.staff_memberships),1,'invitation does not grant membership');
select throws_ok($$select token_digest from public.staff_invites$$,'42501','permission denied for table staff_invites','token digest cannot be read');
select public.mark_staff_invite_delivery(:'invite_id',true);
select public.create_staff_invite('team-unconfirmed@example.test','editor',repeat('b',64)) as unconfirmed_id \gset
select public.mark_staff_invite_delivery(:'unconfirmed_id',true);
select public.create_staff_invite('team-other@example.test','editor',repeat('c',64)) as failed_id \gset
select public.mark_staff_invite_delivery(:'failed_id',false);
reset role;
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
select throws_ok(format('select public.accept_staff_invite(%L,%L)',:'invite_id',repeat('a',64)),'42501','FORBIDDEN','different confirmed email cannot accept');
select throws_ok(format('select public.accept_staff_invite(%L,%L)',:'failed_id',repeat('c',64)),'23505','INVITE_INVALID','mail failure invitation cannot grant role');
reset role;
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
set local role authenticated;
select throws_ok(format('select public.accept_staff_invite(%L,%L)',:'unconfirmed_id',repeat('b',64)),'42501','FORBIDDEN','unconfirmed email cannot accept');
reset role;
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select throws_ok(format('select public.accept_staff_invite(%L,%L)',:'invite_id',repeat('f',64)),'23505','INVITE_INVALID','wrong token refused');
select lives_ok(format('select public.accept_staff_invite(%L,%L)',:'invite_id',repeat('a',64)),'confirmed intended member can accept');
select is(private.current_staff_role(),'operations','acceptance grants intended role');
select throws_ok(format('select public.accept_staff_invite(%L,%L)',:'invite_id',repeat('a',64)),'23505','INVITE_INVALID','token consumed once');
select throws_ok($$select public.create_staff_invite('x@example.test','admin',repeat('d',64))$$,'42501','FORBIDDEN','operations cannot invite');
reset role;
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.create_staff_invite('x@example.test','admin',repeat('d',64))$$,'42501','FORBIDDEN','editor cannot invite');
reset role;
insert into public.audit_events(actor_id,action,entity_type,entity_id) values
 ('40000000-0000-4000-8000-000000000002','content.saved','content','40000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000002','media.saved','media','40000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000002','orders.saved','orders','40000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000003','orders.saved','orders','40000000-0000-4000-8000-000000000001'),
 ('40000000-0000-4000-8000-000000000003','content.saved','content','40000000-0000-4000-8000-000000000001');
set local role authenticated;
select is((select count(*)::int from public.audit_events),2,'editor sees own content and media events only');
reset role;
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select is((select count(*)::int from public.audit_events),1,'operations sees own operational category only');
reset role;
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
create function pg_temp.fail_audit() returns trigger language plpgsql as $$begin raise exception 'audit unavailable'; end$$;
create trigger team_test_audit_failure before insert on public.audit_events for each row execute function pg_temp.fail_audit();
set local role authenticated;
select throws_ok($$select public.change_staff_membership('40000000-0000-4000-8000-000000000002','operations',false)$$,'P0001','audit unavailable','audit failure aborts mutation');
reset role;
select is((select role from public.staff_memberships where user_id='40000000-0000-4000-8000-000000000002'),'editor','role rolled back with audit failure');
select is((select active from public.staff_memberships where user_id='40000000-0000-4000-8000-000000000002'),true,'status rolled back with audit failure');
drop trigger team_test_audit_failure on public.audit_events;
set local role authenticated;
select lives_ok($$select public.change_staff_membership('40000000-0000-4000-8000-000000000002','operations',false)$$,'admin updates role and active status');
reset role;
select ok(not has_function_privilege('authenticated','public.bootstrap_staff_admin(text)','execute'),'clients cannot bootstrap');
select ok(not has_function_privilege('service_role','private.append_audit(text,text,uuid,jsonb)','execute'),'service cannot forge audit');
select is((select count(*)::int from public.audit_events where action='team.changed'),1,'role change audited once');
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select public.create_staff_invite('team-other@example.test','editor',repeat('d',64)) as resend_old \gset
select public.mark_staff_invite_delivery(:'resend_old',true);
select public.create_staff_invite('team-other@example.test','operations',repeat('e',64)) as resend_new \gset
select public.mark_staff_invite_delivery(:'resend_new',true);
reset role;
update public.staff_invites set expires_at=now()-interval '1 minute' where id=:'resend_new';
select set_config('request.jwt.claims','{"sub":"40000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
set local role authenticated;
select throws_ok(format('select public.accept_staff_invite(%L,%L)',:'resend_old',repeat('d',64)),'23505','INVITE_INVALID','resend invalidates old token');
select throws_ok(format('select public.accept_staff_invite(%L,%L)',:'resend_new',repeat('e',64)),'23505','INVITE_INVALID','expired invite cannot grant staff');
select throws_ok($$select public.list_staff()$$,'42501','FORBIDDEN','ordinary member cannot list team');
select is((select count(*)::int from public.staff_invites),0,'ordinary member cannot read invitation details');
reset role;
select ok(not exists(select 1 from public.audit_events where summary::text like '%team-member@example.test%' or summary ? 'token_digest'),'audit contains no invitation email or token digest');
select * from finish();
rollback;
