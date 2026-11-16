alter table public.content_drafts add column base_release_id uuid references public.content_releases(id);
-- Originals and immutable copies are private. Only released DB references authorize website delivery.
create table public.media_assets (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null,
 file_name text not null,
 advertised_size bigint not null check(advertised_size>0),
 mime text not null check(mime in ('image/jpeg','image/png','image/webp','video/mp4','video/webm')),
 usage_key text not null,
 original_path text not null unique,
 metadata jsonb,
 release_path text unique,
 status text not null default 'pending' check(status in ('pending','ready','archived')),
 created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from public,anon,authenticated,service_role;
create table private.media_profiles (usage_key text primary key, policy jsonb not null);
create table private.media_release_assets (
 release_id uuid not null references public.content_releases(id),
 asset_id uuid not null references public.media_assets(id) on delete restrict,
 usage_key text not null,
 primary key(release_id,usage_key)
);
alter table private.media_profiles enable row level security;
alter table private.media_release_assets enable row level security;
revoke all on private.media_profiles,private.media_release_assets from public,anon,authenticated,service_role;
insert into private.media_profiles(usage_key,policy) values
('asset_012d3bf8af92d486','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/evening.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_037b5083d4367575','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260918-clean/prelaunch-flow-clean.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_05056f38e42fe55d','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/nest15-oak-front.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_05a64ae32028cee9','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/hero-unified.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_0c270be51d793f7b','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260918-clean/media-flow-clean.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_0d34c384acd4d56d','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/media.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_137d79f5442fc11a','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/tablet-detail/original-20260915/tablet-hero-original-transparent.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_1469a0e144ef7e2a','{"kind": "video", "profile": "film", "legacyUrl": "/assets/films-20260908/welcome-home.mp4", "mimes": ["video/mp4"], "companions": ["asset_210077b6875ebb01"], "complex": false, "width": 608, "height": 1080, "codec": "h264", "duration": null, "alpha": false, "frameRate": 30.0}'::jsonb),
('asset_1adb9be602d046aa','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260918-clean/faq-flow-clean.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_1b417ae97c567ba5','{"kind": "image", "profile": "background", "legacyUrl": "/assets/chapter-backgrounds-20260910/films.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_1bc081eeeeb864c8','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/nest15-black-angle.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_1ea544f965add638','{"kind": "image", "profile": "background", "legacyUrl": "/assets/ola-detail/backgrounds-20260915/06-final.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_20f8d29a9929cb10','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/tablet-detail/original-20260915/tablet-three-quarter-transparent.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_210077b6875ebb01','{"kind": "image", "profile": "film", "legacyUrl": "/assets/films-20260908/welcome-home.jpg", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_1469a0e144ef7e2a"], "complex": false, "width": 1280, "height": 720}'::jsonb),
('asset_2339b5208d7612f7','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-interactive/go.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_27170c74f4cc762f','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/tablet-detail/generated/tablet-reading-lifestyle-v2.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_27bcf70b57b916d5','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/tablet-detail/generated/tablet-passive-screen-time-v2.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_28eedc556a91dfad','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/generated-set-02/flow-03-open-loop.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_307c3363537a5723','{"kind": "image", "profile": "background", "legacyUrl": "/assets/chapter-backgrounds-20260910/family.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_31eae4e275048ff0','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/about.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_35f542ee3b3d9473','{"kind": "image", "profile": "background", "legacyUrl": "/assets/chapter-backgrounds-20260910/join.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_38c045ee1dd24e31','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/ola-go-ui.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_3a001e1c42f920d1','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/terms.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_3a0fc68ee0629037','{"kind": "image", "profile": "film", "legacyUrl": "/assets/character-20261012/poster-clean.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_a6510e681604d2f9", "asset_6f36183e6da5cc73", "asset_57246e2797dd7da7"], "complex": false, "readOnlyReason": "透明人物需要同步验证 WebM、Safari MOV 与封面；MOV 不在本期新上传支持范围。", "width": 1920, "height": 1080}'::jsonb),
('asset_3f0e57544d2610e7','{"kind": "video", "profile": "film", "legacyUrl": "/assets/story/lumiq-brand-film.mp4", "mimes": ["video/mp4"], "companions": ["asset_c5465b6816a75f09"], "complex": false, "width": 1920, "height": 1080, "codec": "h264", "duration": null, "alpha": false, "frameRate": 30.0}'::jsonb),
('asset_44501cb29fc98694','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-rooms-20260907/room-full-4k.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_446a063b14b8e927','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/family.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_463d87f421f7cde4','{"kind": "image", "profile": "background", "legacyUrl": "/assets/chapter-backgrounds-20260910/experiences.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_49ad6a11223b37c8','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-products-20260907/nest15-angle-confirmed.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_4e5db752a9e31771','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/ola-senior-reminder-v2.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_4efa9ac1966010ad','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/nest-detail/generated/nest-family-kitchen-v2.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_4f5fb66ba7dc95fe','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/tablet-detail/generated/tablet-active-story-time-back-muted-20261001.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_50409433ee3449d3','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/story.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_51f05a7e73f89c59','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/generated-set-02/flow-01-low-arc.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_57246e2797dd7da7','{"kind": "image", "profile": "film", "legacyUrl": "/assets/character-20261012/settled-clean.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_a6510e681604d2f9", "asset_6f36183e6da5cc73", "asset_3a0fc68ee0629037"], "complex": false, "readOnlyReason": "透明人物需要同步验证 WebM、Safari MOV 与封面；MOV 不在本期新上传支持范围。", "width": 1920, "height": 1080}'::jsonb),
('asset_5a52d37e181fb252','{"kind": "image", "profile": "background", "legacyUrl": "/assets/ola-detail/backgrounds-20260915/01-hero.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_5b7b23f94b475d0e','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-products-refined-20260907/tablet-pair.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_5ba0e1d8163c62a4','{"kind": "image", "profile": "background", "legacyUrl": "/assets/chapter-backgrounds-20260910/products.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_8335171d62b1df69"], "complex": false, "width": 1672, "height": 941}'::jsonb),
('asset_5fa455671b41fc69','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/lumiq-tablet.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_6091ade8c5c35bfa','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260918-clean/story-flow-clean.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_63bf91c7eb93c17a','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/ola-bedtime-story-v2.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_6f36183e6da5cc73','{"kind": "video", "profile": "film", "legacyUrl": "/assets/character-20261012/ola-girl-clean-alpha-safari.mov", "mimes": [], "companions": ["asset_a6510e681604d2f9", "asset_3a0fc68ee0629037", "asset_57246e2797dd7da7"], "complex": true, "width": 1920, "height": 1080, "codec": "hevc", "duration": 8, "alpha": true, "readOnlyReason": "透明人物需要同步验证 WebM、Safari MOV 与封面；MOV 不在本期新上传支持范围。", "frameRate": 24.0}'::jsonb),
('asset_700321a1b9f4533b','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/print-detail/consistent-20260907/reading.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_7145d3296daddfe8','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/safety.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_723302ce05f7b130','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/ola-hero-front.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_7334168c1851117c','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/lumiq-print.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_74cd3fba98989129','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/experiences.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_76a5de3f207ca5bb','{"kind": "image", "profile": "film", "legacyUrl": "/assets/home-video/ola-scroll-v16-start-20260909.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_a4b2063e90484449", "asset_d11e4e878cf13138"], "complex": false, "width": 2560, "height": 1440}'::jsonb),
('asset_8335171d62b1df69','{"kind": "video", "profile": "background", "legacyUrl": "/assets/background-variants-20260911/version-5-tail-wave-20260914.mp4", "mimes": ["video/mp4"], "companions": ["asset_5ba0e1d8163c62a4"], "complex": true, "width": 1920, "height": 1080, "codec": "h264", "duration": 30, "alpha": false, "frameRate": 24.0}'::jsonb),
('asset_88efe500e5b410d0','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/ola-go-schoolbag-v2.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_8cca076b45bb13bb','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/brand/lumiq-logo-white-transparent-v2.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_8d201377bedb6b6b','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/tablet-detail/five-ways/imagime-v1.jpg", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_90f01db04a2a0b59','{"kind": "image", "profile": "background", "legacyUrl": "/assets/home-premium-20260907/nest-halo.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_91d55b429b76df2a','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/ola-go-return-home-v3.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_9a83c769ddc9caef','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/join.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_9b7205387e1ed4d0','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-safety-20261002/story-world-family.jpg", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_9be4a1247ceac726','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/ola-detail/original-20260915/ola-high-angle-crop.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_9facedc76c2b867d','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260918-clean/plans-flow-clean.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_a13cd8b7515ae501','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/products/lumiq-print.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_a3dc98ea847871b2','{"kind": "image", "profile": "background", "legacyUrl": "/assets/ola-detail/backgrounds-20260915/02-story.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_a4b2063e90484449','{"kind": "video", "profile": "film", "legacyUrl": "/assets/home-video/compat-20261008/ola-scroll-v16-scrub.mp4", "mimes": ["video/mp4"], "companions": ["asset_76a5de3f207ca5bb", "asset_d11e4e878cf13138"], "complex": true, "width": 1920, "height": 1080, "codec": "h264", "duration": 6.583333, "alpha": false, "frameRate": 24.0}'::jsonb),
('asset_a6510e681604d2f9','{"kind": "video", "profile": "film", "legacyUrl": "/assets/character-20261012/ola-girl-clean-alpha.webm", "mimes": ["video/webm"], "companions": ["asset_6f36183e6da5cc73", "asset_3a0fc68ee0629037", "asset_57246e2797dd7da7"], "complex": true, "width": 1920, "height": 1080, "codec": "vp9", "duration": 8, "alpha": true, "readOnlyReason": "透明人物需要同步验证 WebM、Safari MOV 与封面；MOV 不在本期新上传支持范围。", "frameRate": 24.0}'::jsonb),
('asset_a795af9e87d42422','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/plans.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_a96a7ca7a3fe65e6','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-products-refined-20260907/ola-original-transparent.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_ac2e8eaae020fece','{"kind": "image", "profile": "film", "legacyUrl": "/assets/films-20260908/worlds-together.jpg", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_bb5f211d5118c121"], "complex": false, "width": 1280, "height": 720}'::jsonb),
('asset_af1c0c15cef911c4','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-products-refined-20260907/ola-repaired.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_afd527c3bb80dc38','{"kind": "video", "profile": "film", "legacyUrl": "/assets/films-20260908/everyday-companion.mp4", "mimes": ["video/mp4"], "companions": ["asset_ba9780f819f2e375"], "complex": false, "width": 1920, "height": 1080, "codec": "h264", "duration": null, "alpha": false, "frameRate": 30.0}'::jsonb),
('asset_b0fc987be9c43a11','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-interactive/pearl-light.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b1921d50c6c01ab2','{"kind": "image", "profile": "background", "legacyUrl": "/assets/home-premium-20260907/tablet-halo.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b35289613f6367dc','{"kind": "image", "profile": "background", "legacyUrl": "/assets/home-premium-20260907/print-halo.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b5a5817b8372b323','{"kind": "image", "profile": "background", "legacyUrl": "/assets/ola-detail/backgrounds-20260915/03-scenes.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b5b00f7a4189cbc0','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/ola-family-kitchen-v2.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b6773280778a1b03','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/tablet-parent-controls-v2.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b7165aed3c49a200','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/films.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b81e23fdca833486','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/products/lumiq-ola-go.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b950c7cb7c70aa2d','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/products/lumiq-ola-tablet-hero.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_b96382e3faaa5375','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/print-detail/consistent-20260907/craft.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_ba68d35d82376950','{"kind": "image", "profile": "background", "legacyUrl": "/assets/home-anchored-2026-09-07/join-crystal.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_ba9780f819f2e375','{"kind": "image", "profile": "film", "legacyUrl": "/assets/films-20260908/everyday-companion.jpg", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_afd527c3bb80dc38"], "complex": false, "width": 1280, "height": 720}'::jsonb),
('asset_bb5f211d5118c121','{"kind": "video", "profile": "film", "legacyUrl": "/assets/films-20260908/worlds-together.mp4", "mimes": ["video/mp4"], "companions": ["asset_ac2e8eaae020fece"], "complex": false, "width": 2560, "height": 1440, "codec": "h264", "duration": null, "alpha": false, "frameRate": 30.0}'::jsonb),
('asset_bf09508e13bc01da','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/print-detail/consistent-20260907/pages.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_c5465b6816a75f09','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/lumiq-story-family-v3.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_3f0e57544d2610e7"], "complex": false, "width": 3840, "height": 2160}'::jsonb),
('asset_c90fbe22d7d3cb65','{"kind": "image", "profile": "background", "legacyUrl": "/assets/ola-detail/backgrounds-20260915/05-strengths.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_ceeef07a274fb86e','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/morning.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_cf10ad0a75bcb248','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/nest15-walnut-front.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_cfab6960e3e4fad9','{"kind": "image", "profile": "background", "legacyUrl": "/assets/home-premium-20260907/ola-halo.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d11e4e878cf13138','{"kind": "image", "profile": "film", "legacyUrl": "/assets/home-video/ola-scroll-v16-end-20260909.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": ["asset_a4b2063e90484449", "asset_76a5de3f207ca5bb"], "complex": false, "width": 2560, "height": 1440}'::jsonb),
('asset_d1ad8dd5bdfbf760','{"kind": "image", "profile": "background", "legacyUrl": "/assets/mobile-backgrounds-20260914/products.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d2d12ceec8d371d0','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/cookies.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d4055fda93896dd6','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/ola-go-detail/original-20260915/ola-go-three-quarter.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d44e0814abbebfad','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/print-detail/consistent-20260907/gift.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d5fbac1e9755dc9c','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/nest-detail/generated/nest-routine-closeup-v2.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d6c99816cec8aded','{"kind": "image", "profile": "background", "legacyUrl": "/assets/chapter-backgrounds-20260910/safety.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d7ecc19f147a2202','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/home-interactive/print.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_d91f09496c0e79ea','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/contact.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_da896ce0780cca53','{"kind": "image", "profile": "background", "legacyUrl": "/assets/ola-detail/backgrounds-20260915/04-features.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_db2b43c552f5a337','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/ola-go-bedside-journal-v3.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_de6d7af49ce01a95','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/faq.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_e036cbcfe52d5970','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/brand/lumiq-logo-transparent-dark.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_e589e6544320d14c','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/products.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_e70d871db07c298c','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/western-scenes-20260908/afternoon.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_e72d00b15369d5bc','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/lumiq-ola-go.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_e952cecf44ce1cc1','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/generated-set-02/flow-02-diagonal-convergence.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_ec014a3fa141a91f','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/prelaunch.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_edd9b6feea2c227d','{"kind": "image", "profile": "background", "legacyUrl": "/assets/home-premium-20260907/ola-go-halo.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_ee4b8b73451d2ca7','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/nest15-oak-angle.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_eeb12b0a16838df4','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/nest15-walnut-angle.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_ef1229bce355c0a5','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/ola-go-detail/generated/ola-go-weather-walk-v2.png", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_f5b8b5725dbebcd8','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/nest15-black-front.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_faca783fe64e017d','{"kind": "image", "profile": "background", "legacyUrl": "/assets/subpage-backgrounds-20260915/child-safety.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb),
('asset_fc719b255cde1427','{"kind": "image", "profile": "public-content", "legacyUrl": "/assets/web/nest15-rear.webp", "mimes": ["image/jpeg", "image/png", "image/webp"], "companions": [], "complex": false}'::jsonb);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('media-originals','media-originals',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
 ('media-releases','media-releases',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']);
-- No browser storage policies: signed uploads are minted only after staff authorization for one fixed prefix.
create function public.create_media_upload(file_name text,advertised_size bigint,mime text,usage_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare asset uuid:=gen_random_uuid(); policy jsonb; max_bytes bigint;
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','editor']);
 select p.policy into policy from private.media_profiles p where p.usage_key=create_media_upload.usage_key;
 select least( case when policy->>'kind'='image' then 20971520 else 52428800 end, file_size_limit) into max_bytes from storage.buckets where id='media-originals';
 if policy is null or policy ? 'readOnlyReason' or not (policy->'mimes' ? mime) or file_name is null or length(trim(file_name))=0 or length(file_name)>200 or file_name ~ '[/\\[:cntrl:]]' or advertised_size is null or advertised_size<=0 or advertised_size>max_bytes then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 insert into public.media_assets(id,created_by,file_name,advertised_size,mime,usage_key,original_path)
 values(asset,auth.uid(),file_name,advertised_size,mime,usage_key,auth.uid()::text||'/'||asset::text);
 perform private.append_audit('media.upload_created','media_asset',asset,jsonb_build_object('usage',usage_key));
 return jsonb_build_object('assetId',asset,'path',auth.uid()::text||'/'||asset::text,'maxBytes',max_bytes);
end$$;
create function public.get_media_assets(asset_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 perform private.assert_staff_role(array['admin','editor']);
 return coalesce((select jsonb_agg(to_jsonb(a)) from (select * from public.media_assets m where (asset_id is null or m.id=asset_id) order by created_at desc limit 200) a),'[]');
end$$;
create function public.complete_media_asset(asset_id uuid,actor_id uuid,metadata jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare a public.media_assets%rowtype; p jsonb;
begin
 perform pg_advisory_xact_lock(7410404);
 if not exists(select 1 from public.staff_memberships s join public.profiles pr using(user_id) where s.user_id=actor_id and s.active and s.role in ('admin','editor') and pr.access_state='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into a from public.media_assets where id=asset_id for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if a.created_by<>actor_id then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 if a.status<>'pending' then raise exception 'CONFLICT' using errcode='23505'; end if;
 select policy into p from private.media_profiles where usage_key=a.usage_key;
 if metadata is null or jsonb_typeof(metadata)<>'object' or not (metadata ?& array['size','mime','width','height','duration','codec','alpha','sha256']) or metadata->>'size' is null or metadata->>'codec' is null or jsonb_typeof(metadata->'alpha') is distinct from 'boolean' or metadata->>'sha256' is null or metadata->>'width' is null or metadata->>'height' is null or (metadata->>'width')::bigint*(metadata->>'height')::bigint>67108864 or p ? 'readOnlyReason' or metadata->>'mime' is distinct from a.mime or (metadata->>'size')::bigint<>a.advertised_size or (metadata->>'width')::int<=0 or (metadata->>'height')::int<=0 or metadata->>'sha256' !~ '^[a-f0-9]{64}$' or not exists(select 1 from storage.objects o where bucket_id='media-originals' and name=a.original_path and (o.metadata->>'size')::bigint=a.advertised_size) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 if p->>'width' is not null and abs((metadata->>'width')::numeric/(metadata->>'height')::numeric-(p->>'width')::numeric/(p->>'height')::numeric)>0.001 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 if p->>'kind'='video' and (metadata->>'duration' is null or metadata->>'codec' is null) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 if p->>'kind'='video' and (metadata->>'codec' is distinct from p->>'codec' or abs((metadata->>'width')::numeric/(metadata->>'height')::numeric-(p->>'width')::numeric/(p->>'height')::numeric)>0.001 or (metadata->>'duration')::numeric<=0 or (metadata->>'duration')::numeric>600 or (p->>'duration' is not null and abs((metadata->>'duration')::numeric-(p->>'duration')::numeric)>1.0/24) or (coalesce((p->>'alpha')::boolean,false) and metadata->>'alpha'<>'true')) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 update public.media_assets set metadata=complete_media_asset.metadata,status='ready' where id=asset_id;
 -- This service-only finalization uses verified actor_id; audit accepts no caller role or metadata.
 perform private.append_audit('system.media_validated','media_asset',asset_id,jsonb_build_object('usage',a.usage_key));
end$$;
create function public.mark_media_copy(asset_id uuid,actor_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare a public.media_assets%rowtype; target text;
begin
 perform pg_advisory_xact_lock(7410404);
 if not exists(select 1 from public.staff_memberships s join public.profiles p using(user_id) where s.user_id=actor_id and s.active and s.role='admin' and p.access_state='active') then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 select * into a from public.media_assets where id=asset_id for update;
 target:='releases/'||a.id::text||'/'||(a.metadata->>'sha256');
 if not exists(select 1 from storage.buckets where id='media-releases' and not public) or a.status<>'ready' or target is null or not exists(select 1 from storage.objects o where bucket_id='media-releases' and name=target and (o.metadata->>'size')::bigint=a.advertised_size) then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 update public.media_assets set release_path=target where id=asset_id;
end$$;
create function public.archive_media_asset(asset_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','editor']);
 update public.media_assets set status='archived' where id=asset_id;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 perform private.append_audit('media.archived','media_asset',asset_id,'{}');
end$$;
create function private.assert_media_snapshot(snapshot jsonb,historical_release uuid default null,base_release uuid default null) returns void
language plpgsql set search_path='' as $$
declare slot record; a public.media_assets%rowtype; p jsonb; partner text;
begin
 if exists(select 1 from storage.buckets where id in ('media-originals','media-releases') and public) then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
 for slot in select key,value from jsonb_each(coalesce(snapshot->'media','{}')) loop
  if slot.value->>'assetId' is null then
   if slot.value->>'url' like '/api/media/%' then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
   continue;
  end if;
  select * into a from public.media_assets where id=(slot.value->>'assetId')::uuid;
  select policy into p from private.media_profiles where usage_key=slot.key;
  if a.id is null or p is null or p ? 'readOnlyReason' or not(p->'mimes' ? a.mime) or a.usage_key<>slot.key or slot.value->>'url' is distinct from '/api/media/'||a.id::text or slot.value->>'kind' is distinct from p->>'kind' or slot.value->>'profile' is distinct from p->>'profile' or a.metadata->>'mime' is distinct from a.mime or a.release_path is null or
   not exists(select 1 from storage.objects o where bucket_id='media-releases' and name=a.release_path and (o.metadata->>'size')::bigint=a.advertised_size) or
   (historical_release is null and a.status<>'ready' and not (a.status='archived' and exists(
    select 1 from private.media_release_assets r join public.content_releases b on b.id=r.release_id
    where r.release_id=base_release and r.asset_id=a.id and r.usage_key=slot.key
    and b.snapshot->'media'->slot.key->>'assetId'=a.id::text
    and b.snapshot->'media'->slot.key->>'url'=slot.value->>'url'
    and b.snapshot->'media'->slot.key->>'kind'=slot.value->>'kind'
    and b.snapshot->'media'->slot.key->>'profile'=slot.value->>'profile'
   ))) or
   (historical_release is not null and not exists(select 1 from private.media_release_assets r where r.release_id=historical_release and r.asset_id=a.id and r.usage_key=slot.key))
  then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
  for partner in select jsonb_array_elements_text(p->'companions') loop
   if snapshot->'media'->partner->>'assetId' is null then raise exception 'MEDIA_COMPANION_REQUIRED' using errcode='22023'; end if;
  end loop;
 end loop;
end$$;
create function private.record_media_release(release_id uuid,snapshot jsonb) returns void
language sql set search_path='' as $$
 insert into private.media_release_assets(release_id,asset_id,usage_key)
 select release_id,(value->>'assetId')::uuid,key from jsonb_each(coalesce(snapshot->'media','{}')) where value->>'assetId' is not null;
$$;
create function public.get_public_asset(asset_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',a.id,'path',a.release_path,'mime',a.mime,'size',a.advertised_size)
 from public.media_assets a where a.id=asset_id and a.release_path is not null and exists(select 1 from storage.buckets where id='media-releases' and not public)
 and exists(select 1 from private.media_release_assets r join public.content_releases c on c.id=r.release_id where r.asset_id=a.id and c.snapshot->'media'->r.usage_key->>'assetId'=a.id::text);
$$;
revoke all on function public.create_media_upload(text,bigint,text,text),public.get_media_assets(uuid),public.archive_media_asset(uuid),public.complete_media_asset(uuid,uuid,jsonb),public.mark_media_copy(uuid,uuid),public.get_public_asset(uuid) from public,anon,authenticated,service_role;
grant execute on function public.create_media_upload(text,bigint,text,text),public.get_media_assets(uuid),public.archive_media_asset(uuid) to authenticated;
grant execute on function public.complete_media_asset(uuid,uuid,jsonb),public.mark_media_copy(uuid,uuid) to service_role;
grant execute on function public.get_public_asset(uuid) to anon,authenticated,service_role;
revoke all on function private.assert_media_snapshot(jsonb,uuid,uuid),private.record_media_release(uuid,jsonb) from public,anon,authenticated,service_role;

create or replace function public.publish_content_draft(id uuid,expected_version integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare draft public.content_drafts%rowtype; new_release uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 perform pg_advisory_xact_lock(7410606); -- independent global publication/rollback serialization
 perform private.assert_staff_role(array['admin']);
 select * into draft from public.content_drafts d where d.id=publish_content_draft.id for update;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 if draft.version is distinct from expected_version then raise exception 'CONFLICT' using errcode='23505'; end if;
 perform private.assert_media_snapshot(draft.snapshot,null,draft.base_release_id);
 perform private.consume_content_validation('draft',id,draft.version,draft.snapshot);
 insert into public.content_releases(snapshot,draft_id,draft_version,created_by) values(draft.snapshot,id,draft.version,auth.uid()) returning content_releases.id into new_release;
 perform private.record_media_release(new_release,draft.snapshot);
 update public.content_publication set release_id=new_release,updated_at=clock_timestamp() where singleton;
 perform private.append_audit('content.published','content_release',new_release,jsonb_build_object('draftId',id,'version',draft.version));
 return new_release;
end$$;
create or replace function public.rollback_content_release(release_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare target public.content_releases%rowtype; new_release uuid;
begin
 perform pg_advisory_xact_lock(7410404);
 perform pg_advisory_xact_lock(7410606);
 perform private.assert_staff_role(array['admin']);
 select * into target from public.content_releases r where r.id=rollback_content_release.release_id;
 if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
 perform private.assert_media_snapshot(target.snapshot,release_id);
 perform private.consume_content_validation('release',release_id,0,target.snapshot);
 insert into public.content_releases(snapshot,rollback_of,created_by) values(target.snapshot,release_id,auth.uid()) returning id into new_release;
 perform private.record_media_release(new_release,target.snapshot);
 update public.content_publication set release_id=new_release,updated_at=clock_timestamp() where singleton;
 perform private.append_audit('content.rolled_back','content_release',new_release,jsonb_build_object('rollbackOf',release_id));
 return new_release;
end$$;

create function private.assert_media_selection(snapshot jsonb,baseline jsonb) returns void
language plpgsql set search_path='' as $$
declare slot record; a public.media_assets%rowtype; p jsonb;
begin
 for slot in select key,value from jsonb_each(coalesce(snapshot->'media','{}')) loop
  if slot.value->>'assetId' is null then continue; end if;
  select * into a from public.media_assets where id=(slot.value->>'assetId')::uuid;
  select policy into p from private.media_profiles where usage_key=slot.key;
  if a.id is null or p is null or p ? 'readOnlyReason' or a.usage_key<>slot.key or slot.value->>'kind' is distinct from p->>'kind' or slot.value->>'profile' is distinct from p->>'profile' or slot.value->>'url' is distinct from '/api/media/'||a.id::text or
    (a.status<>'ready' and not coalesce(a.status='archived' and baseline->'media'->slot.key->>'assetId'=a.id::text and baseline->'media'->slot.key->>'url'=slot.value->>'url' and baseline->'media'->slot.key->>'kind'=slot.value->>'kind' and baseline->'media'->slot.key->>'profile'=slot.value->>'profile',false)) then raise exception 'INVALID_MEDIA' using errcode='22023'; end if;
 end loop;
end$$;
revoke all on function private.assert_media_selection(jsonb,jsonb) from public,anon,authenticated,service_role;

create or replace function public.save_content_draft(id uuid,expected_version integer,snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare previous public.content_drafts%rowtype; baseline jsonb; new_version integer; base_release uuid;
begin
 -- Shares A4's lock so role revocation cannot race the final DB authorization.
 perform pg_advisory_xact_lock(7410404);
 perform private.assert_staff_role(array['admin','editor']);
 if id is null or expected_version is null or expected_version<0 then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 select * into previous from public.content_drafts d where d.id=save_content_draft.id for update;
 if (not found and expected_version<>0) or (found and previous.version<>expected_version) then raise exception 'CONFLICT' using errcode='23505'; end if;
 if private.current_staff_role()<>'admin' then
  baseline:=previous.snapshot;
  if baseline is null then select r.snapshot into baseline from public.content_publication p join public.content_releases r on r.id=p.release_id where p.singleton; end if;
  if baseline is null or snapshot->'settings' is distinct from baseline->'settings' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
 end if;
 if snapshot is null or jsonb_typeof(snapshot)<>'object' or jsonb_typeof(snapshot->'settings') is distinct from 'object' then raise exception 'INVALID_INPUT' using errcode='22023'; end if;
 if previous.id is null then select release_id into base_release from public.content_publication where singleton; else base_release:=previous.base_release_id; end if;
 select r.snapshot into baseline from public.content_releases r where r.id=base_release;
 perform private.assert_media_selection(snapshot,baseline);
 new_version:=expected_version+1;
 if previous.id is null then
  insert into public.content_drafts(id,version,snapshot,created_by,updated_by,base_release_id) values(id,new_version,snapshot,auth.uid(),auth.uid(),base_release) on conflict do nothing;
  if not found then raise exception 'CONFLICT' using errcode='23505'; end if;
 else
  update public.content_drafts d set snapshot=save_content_draft.snapshot,version=new_version,status='editing',updated_by=auth.uid(),updated_at=clock_timestamp() where d.id=save_content_draft.id;
 end if;
 delete from private.content_validation_receipts r where r.purpose='draft' and r.target_id=save_content_draft.id;
 perform private.append_audit('content.saved','content_draft',id,jsonb_build_object('version',new_version));
 return jsonb_build_object('id',id,'version',new_version);
end$$;
