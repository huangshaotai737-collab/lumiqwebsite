-- Add supplied Orb UI slots without changing historical release slots or assets.
insert into private.media_profiles(usage_key,policy) values
('asset_dc26b27fe3117728', '{"kind": "image", "profile": "asset_dc26b27fe3117728", "legacyUrl": "/assets/orb-ui-20261102/cook.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false, "width": 1920, "height": 1080}'::jsonb),
('asset_f7e2ba338d31371b', '{"kind": "image", "profile": "asset_f7e2ba338d31371b", "legacyUrl": "/assets/orb-ui-20261102/recipe.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false, "width": 1920, "height": 1080}'::jsonb),
('asset_9ccabb9a31b94ad2', '{"kind": "image", "profile": "asset_9ccabb9a31b94ad2", "legacyUrl": "/assets/orb-ui-20261102/calendar.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false, "width": 1920, "height": 1080}'::jsonb),
('asset_a9189b139b2ce05e', '{"kind": "image", "profile": "asset_a9189b139b2ce05e", "legacyUrl": "/assets/orb-ui-20261102/tasks.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false, "width": 1920, "height": 1080}'::jsonb),
('asset_3dbef3e285441f46', '{"kind": "image", "profile": "asset_3dbef3e285441f46", "legacyUrl": "/assets/orb-ui-20261102/rewards.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false, "width": 1920, "height": 1080}'::jsonb),
('asset_dd25b70a62c78f12', '{"kind": "image", "profile": "asset_dd25b70a62c78f12", "legacyUrl": "/assets/orb-ui-20261102/gallery.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false, "width": 1920, "height": 1080}'::jsonb)
on conflict (usage_key) do nothing;
