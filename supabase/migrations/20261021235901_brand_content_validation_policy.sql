-- Additive brand content validation. No business tables or releases are changed.
-- The CLI-created file is sequenced after the existing future-dated migrations.
do $$
begin
 if (select active_version from private.content_validation_policy where singleton)
    not in ('media-products-v3-20261021','brand-content-v4-20261021') then
   raise exception 'Unexpected content validation policy';
 end if;
end$$;
update private.content_validation_policy
set active_version='brand-content-v4-20261021' where singleton;
delete from private.content_validation_receipts
where policy_version<>'brand-content-v4-20261021';
