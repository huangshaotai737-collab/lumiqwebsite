-- Add merged adult/elder lifestyle image; historical media slots remain intact.
insert into private.media_profiles(usage_key,policy) values
('asset_1cda2c90e6c65f98', '{"kind": "image", "profile": "asset_1cda2c90e6c65f98", "legacyUrl": "/assets/ola-scenes-20261103/adult-senior-companion.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false, "width": 1448, "height": 1086}'::jsonb)
on conflict (usage_key) do nothing;
