-- Included fixture (not a standalone pgTAP suite). No published user
-- content is required. Callers create their own release inside a rolled-back transaction.
create function pg_temp.content_boundary_snapshot() returns jsonb
language sql as $$
 select jsonb_build_object(
  'schemaVersion',1,'settings','{}'::jsonb,'plans','[]'::jsonb,
  'products','{
   "ola":{"image":"/assets/web/ola-hero-front.webp"},
   "ola-go":{"image":"/assets/web/lumiq-ola-go.webp"},
   "tablet":{"image":"/assets/web/lumiq-tablet.webp"},
   "print":{"image":"/assets/web/lumiq-print.webp"},
   "nest":{"image":"/assets/web/nest15-oak-angle.webp"}
  }'::jsonb,
  'media','{
   "asset_012d3bf8af92d486":{"assetId":null,"url":"/assets/western-scenes-20260908/evening.webp","alt":"","kind":"image","profile":"public-content"},
   "asset_6f36183e6da5cc73":{"assetId":null,"url":"/assets/character-20261012/ola-girl-clean-alpha-safari.mov","alt":"","kind":"video","profile":"film"}
  }'::jsonb,
  'messages',(select jsonb_object_agg(locale,jsonb_build_object(
   'Legal',jsonb_build_object('eyebrow','Synthetic legal','draft','Synthetic draft','terms',
    (select jsonb_object_agg(k,'Synthetic '||k) from unnest(array['title','intro','p1','h1','p2','h2','p3','h3','p4','h4','p5']) k)),
   'Products',jsonb_build_object('shipping','Synthetic shipping','returns','Synthetic returns','warranty','Synthetic warranty')))
   from unnest(array['en','zh-hant','ja']) locale));
$$;
