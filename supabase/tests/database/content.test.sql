begin;
select no_plan();
update public.content_publication set release_id=null;
select has_table('public','content_drafts','versioned content drafts exist');
select has_table('public','content_releases','immutable releases exist');
select has_function('public','save_content_draft',array['uuid','integer','jsonb'],'optimistic draft RPC exists');
insert into auth.users(id,email,email_confirmed_at) values
 ('60000000-0000-4000-8000-000000000001','b2-admin@example.test',now()),
 ('60000000-0000-4000-8000-000000000002','b2-editor@example.test',now()),
 ('60000000-0000-4000-8000-000000000003','b2-ops@example.test',now());
insert into public.staff_memberships(user_id,role) values
 ('60000000-0000-4000-8000-000000000001','admin'),
 ('60000000-0000-4000-8000-000000000002','editor'),
 ('60000000-0000-4000-8000-000000000003','operations');
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select lives_ok($$select public.save_content_draft('60000000-0000-4000-8000-000000000010',0,'{"schemaVersion":1,"settings":{"siteUrl":"https://example.test","supportEmail":"a@example.test","contactText":{}},"messages":{},"products":{},"plans":[],"media":{}}')$$,'admin can create a raw draft, never a published release');
select is(public.get_published_content(),null::jsonb,'draft never changes public release');
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1)$$,'22023','VALIDATION_REQUIRED','direct publication cannot bypass full server validation');
select throws_ok($$select public.attest_content_snapshot('draft','60000000-0000-4000-8000-000000000010',1,'{}','x','60000000-0000-4000-8000-000000000001')$$,'42501',null,'browser cannot create a validation attestation');
select throws_ok($$select public.save_content_draft('60000000-0000-4000-8000-000000000010',0,'{}')$$,'23505','CONFLICT','stale version conflicts');
reset role;
-- The narrow service attestation is a trust boundary, not a SQL replacement for FormatJS.
select public.attest_content_snapshot('draft',id,version,snapshot,'legacy-slots-v2-20261020','60000000-0000-4000-8000-000000000001') from public.content_drafts where id='60000000-0000-4000-8000-000000000010';
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',2)$$,'23505','CONFLICT','receipt never bypasses draft version check');
reset role;
update private.content_validation_receipts set expires_at=clock_timestamp()-interval '1 second';
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1)$$,'22023','VALIDATION_REQUIRED','expired receipt fails closed');
reset role;
update private.content_validation_receipts set expires_at=clock_timestamp()+interval '5 minutes',actor_id='60000000-0000-4000-8000-000000000002';
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1)$$,'22023','VALIDATION_REQUIRED','receipt is bound to verified actor');
reset role;
update private.content_validation_receipts set actor_id='60000000-0000-4000-8000-000000000001',purpose='release';
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1)$$,'22023','VALIDATION_REQUIRED','release receipt cannot authorize draft publication');
reset role;
update private.content_validation_receipts set purpose='draft',policy_version='old-policy';
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1)$$,'22023','VALIDATION_REQUIRED','receipt is bound to current DB policy');
reset role;
select throws_ok($$select public.attest_content_snapshot('draft','60000000-0000-4000-8000-000000000010',1,'{}','legacy-slots-v2-20261020','60000000-0000-4000-8000-000000000001')$$,'23505','CONFLICT','trusted attestation cannot silently normalize or rewrite stored snapshot');
select throws_ok($$select public.attest_content_snapshot('draft','60000000-0000-4000-8000-000000000010',1,'{}','browser-policy','60000000-0000-4000-8000-000000000001')$$,'22023','VALIDATION_POLICY_MISMATCH','active policy cannot be caller-selected');
update private.content_validation_receipts set policy_version='legacy-slots-v2-20261020';
set local role authenticated;
select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1) as release_id \gset
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1)$$,'22023','VALIDATION_REQUIRED','publication consumes its receipt atomically');
select is((public.get_published_content()->>'releaseId'),:'release_id','published pointer changes to new immutable release');
reset role;
select is((select count(*)::int from public.audit_events where action='content.published' and actor_id='60000000-0000-4000-8000-000000000001'),1,'publication audit is written once');
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',1)$$,'42501','FORBIDDEN','editor cannot call publish RPC directly');
select throws_ok(format('select public.rollback_content_release(%L)',:'release_id'),'42501','FORBIDDEN','editor cannot rollback directly');
select throws_ok($$select public.save_content_draft('60000000-0000-4000-8000-000000000010',1,'{"settings":{"supportEmail":"changed@example.test"}}')$$,'42501','FORBIDDEN','editor cannot bypass settings controls with raw snapshot RPC');
select lives_ok($$select public.save_content_draft('60000000-0000-4000-8000-000000000010',1,(public.get_content_draft('60000000-0000-4000-8000-000000000010')->'snapshot')||'{"messages":{"en":{"test":"Broken {"}}}')$$,'editor can save content while preserving settings');
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',2)$$,'42501','FORBIDDEN','editor is still denied after content save');
reset role;
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',2)$$,'22023','VALIDATION_REQUIRED','saving a new version invalidates previous attestation');
reset role;
select public.attest_content_snapshot('release',id,0,snapshot,'legacy-slots-v2-20261020','60000000-0000-4000-8000-000000000001') from public.content_releases where id=:'release_id';
set local role authenticated;
select public.rollback_content_release(:'release_id') as rollback_id \gset
select isnt(:'rollback_id'::text,:'release_id'::text,'rollback creates a new release');
reset role;
select is((select count(*)::int from public.content_releases where created_by='60000000-0000-4000-8000-000000000001'),2,'old release survives rollback unchanged');
select is((select snapshot from public.content_releases where id=:'release_id'),(select snapshot from public.content_releases where id=:'rollback_id'),'rollback copies exact immutable target');
select public.attest_content_snapshot('draft',id,version,snapshot,'legacy-slots-v2-20261020','60000000-0000-4000-8000-000000000001') from public.content_drafts where id='60000000-0000-4000-8000-000000000010';
create function pg_temp.fail_content_audit() returns trigger language plpgsql as $$begin raise exception 'audit unavailable'; end$$;
create trigger content_test_audit_failure before insert on public.audit_events for each row execute function pg_temp.fail_content_audit();
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',2)$$,'P0001','audit unavailable','audit failure aborts entire publication');
select is(public.get_published_content()->>'releaseId',:'rollback_id','audit failure leaves pointer unchanged');
reset role;
drop trigger content_test_audit_failure on public.audit_events;
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.get_content_draft('60000000-0000-4000-8000-000000000010')$$,'42501','FORBIDDEN','operations cannot read drafts');
reset role;
select ok(not has_table_privilege('authenticated','public.content_releases','UPDATE'),'clients cannot mutate releases');
select ok(not has_table_privilege('service_role','public.content_drafts','UPDATE'),'privileged validation credential has no generic content write access');
select ok(not has_function_privilege('anon','public.get_content_draft(uuid)','execute'),'anonymous users cannot retrieve drafts');
select throws_ok(format('update public.content_releases set snapshot=%L where id=%L','{}',:'release_id'),'55000','content releases are immutable','old release cannot be updated even through privileged SQL');
update public.staff_memberships set active=false where user_id='60000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
set local role authenticated;
select throws_ok($$select public.publish_content_draft('60000000-0000-4000-8000-000000000010',2)$$,'42501','FORBIDDEN','final DB boundary rejects deactivated admin despite existing receipt');
reset role;
select * from finish();
rollback;
