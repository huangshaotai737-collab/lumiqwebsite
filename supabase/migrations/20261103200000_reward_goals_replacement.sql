-- The supplied populated reward-goals screen replaces the empty screenshot.
-- Preserve the original URL for historical release validation and rollback.
update private.media_profiles
set policy = jsonb_set(policy, '{additionalLegacyUrls}',
  coalesce(policy->'additionalLegacyUrls', '[]'::jsonb)
    || '["/assets/orb-ui-20261103/reward-goals.png"]'::jsonb)
where usage_key = 'asset_3dbef3e285441f46'
  and not coalesce(policy->'additionalLegacyUrls' ? '/assets/orb-ui-20261103/reward-goals.png', false);
