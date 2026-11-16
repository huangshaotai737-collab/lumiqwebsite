-- Add adult lifestyle imagery; retain every historical media policy and slot.
insert into private.media_profiles(usage_key,policy) values
('asset_017e7987ef331c24', '{"kind":"image","profile":"asset_017e7987ef331c24","legacyUrl":"/assets/product-scenes-20261103/olago-home.webp","mimes":["image/jpeg","image/png","image/webp"],"companions":[],"complex":false,"width":1448,"height":1086}'::jsonb),
('asset_92fd3c30968cbc37', '{"kind":"image","profile":"asset_92fd3c30968cbc37","legacyUrl":"/assets/product-scenes-20261103/olago-outdoor.webp","mimes":["image/jpeg","image/png","image/webp"],"companions":[],"complex":false,"width":1448,"height":1086}'::jsonb),
('asset_5f21bf6c2f500259', '{"kind":"image","profile":"asset_5f21bf6c2f500259","legacyUrl":"/assets/product-scenes-20261103/olago-journal.webp","mimes":["image/jpeg","image/png","image/webp"],"companions":[],"complex":false,"width":1448,"height":1086}'::jsonb)
on conflict (usage_key) do nothing;
