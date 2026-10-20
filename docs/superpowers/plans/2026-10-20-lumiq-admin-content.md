# LumiQ Content and Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可管理三语文案和素材、可预览发布与回滚、保持现有官网视觉的 CMS。

**Architecture:** A 的员工权限约束草稿和发布事务；完整不可变快照供官网读取。上传原件与发布副本均受存储权限约束，由官网公开媒体入口只提供已发布资源，避免复制中途失败泄露草稿。

**Tech Stack:** 两个现有 Next.js 应用、next-intl、Supabase Postgres/Storage、Vitest、Playwright、pgTAP。

**Spec:** [详细设计](../specs/2026-10-20-lumiq-admin-platform-design.md) 第 3–5、9–12 节；[总计划](./2026-10-20-lumiq-admin-platform.md)。先完成 A。

## Global Constraints

- 继承总计划全部约束；官网继续使用现有英文、繁体中文和日文。`nest` 继续对应展示名称 Lumiq Orb。
- 官网已发布内容缓存最长 60 秒；草稿与会员、订单接口始终 `no-store`。不改原视差、轮播、视频时序或响应式算法。
- 管理员发布/回滚，编辑仅保存草稿和提交待发布。回滚不改变会员、报名或订单。
- 新图片单文件默认上限 20 MB，视频 50 MB；实际取存储与应用配置中的较小值。JPEG、PNG、WebP、MP4、WebM 可上传，HTML 不可上传。

## Review Focus

总计划第 3 条由 B1/B2 验证，第 4 条由 B3 验证。B4 另覆盖数据库故障回退、私有预览不进入公共缓存和图片优化器误缓存私有预览。

## B1：内容契约、现有内容导入与完整性校验

**Files:** Create `contracts/content.ts`；官网 `lib/content/{initial-snapshot,parse,inventory}.ts`、`lib/content/initial-snapshot.json`、`lib/content/field-manifest.json`、`scripts/export-initial-content.mjs`、`tests/content-snapshot.test.ts`；后台 `features/content/{schema,fields}.ts`、`features/content/schema.test.ts`；契约同步至两站 `lib/generated/platform/content.ts`。

**Interfaces:** `ContentSnapshot = {schemaVersion:1;messages:Record<Locale,MessageTree>;products:Record<ProductId,ProductPresentation>;media:Record<string,MediaSlot>;plans:PlanPresentation[];settings:{siteUrl:string;supportEmail:string;contactText:Record<Locale,string>}}`。`MessageTree` 为递归 string/对象；`ProductPresentation` 保留现有目录字段和参考价类型，固定 ID/href/历史链接；`PlanPresentation` 为 `{group:'tablet'|'ola';tiers:string[];rows:{id:string;labelKey:string;values:(string|boolean)[]}[]}`，沿用现有收费展示解析，不能用于扣款。`MediaSlot={assetId:UUID|null;url:string;alt:string;kind:'image'|'video';profile:string}`。`parseSnapshot(input:unknown):ContentSnapshot`；`validateDraft(input:unknown):{ok:true;snapshot:ContentSnapshot}|{ok:false;issues:{path:string;message:string}[]}`。

`ProductPresentation` 的字段名固定为 `id/name/shortName/category/href/legacyHrefs/image/price/summary/highlights/contentStatus`，类型与现有 `ProductCatalogEntry` 一致，contentStatus 另允许 confirmed；price 沿用 usd/included/pending 联合，独立 SKU 的实际币种价格由 C3 管理，不能从展示 price 推导可售资格。媒体 URL 只允许现有 `/assets/`、受控 `/api/media/:assetId` 与部署配置允许的存储来源；外部链接禁用脚本协议。系统设置不能改变认证回跳允许域名或授权媒体代理抓取任意 URL。

- [ ] **1. 写失败测试。** `initial_snapshot_preserves_site` 断言 `expect(snapshot.products.nest.href).toBe('/products/nest')`，产品 ID 集合严格等于五项，三语键及原始价格/方案/文案与当前代码一致；`invalid_icu_blocks_publish` 断言 `expect(validateDraft(brokenIcuSnapshot).ok).toBe(false)`，brokenIcuSnapshot 由有效初始快照只移除一个实际存在的变量生成。非法 URL 协议、未知 schemaVersion 和空 messages 被拒绝，测试枚举现有 JSON 的键而不发明命名空间。
- [ ] **2. 验证失败。** Run 官网 `test -- tests/content-snapshot.test.ts` 和后台 `test -- features/content/schema.test.ts`，预期缺快照/校验器 FAIL。
- [ ] **3. 导入并建立 manifest。** 导入 messages 三语全部现有键、`lib/products.ts`、PlansContent 的 hardware/tabletRows/palRows，以及所有已确认范围页面的媒体与硬编码展示字段。manifest 每项包含字段路径、页面、类型、长度限制、ICU 占位签名及媒体用途；不接受任意脚本/任意 CSS。单行标题默认 80 字符，正文 2000，SEO title 120/description 320；已有更长文本以原长度作为该字段下限保留，不截断导入内容。
- [ ] **4. 验证通过。** 上述两组测试及 `node scripts/sync-platform-contracts.mjs --check` PASS；导出是确定性的，重复运行无 diff。范围覆盖首页、产品总览/五详情、story/about/contact/plans/prelaunch/members 公共介绍/FAQ/四法律页、全局导航/页脚和 Metadata。
- [ ] **5. 提交。** `feat: define content snapshot and import existing website content`。

## B2：草稿编辑、并发保护、原子发布与回滚

**Files:** Create `*_content_releases.sql`、`supabase/tests/database/content.test.sql`；后台 `features/content/{service.ts,ContentEditor.tsx,ReleaseHistory.tsx}`、`app/(protected)/content/page.tsx`、`app/(protected)/content/[id]/page.tsx`、`app/api/content/{drafts,publish,rollback}/route.ts`、`features/content/service.test.ts`、`tests/e2e/content-editor.spec.ts`。

**Interfaces:** `saveDraft(input:{id:UUID;expectedVersion:number;snapshot:ContentSnapshot}):Promise<ApiResult<{id:UUID;version:number}>>`；`publishDraft(input:{id:UUID;expectedVersion:number}):Promise<ApiResult<{releaseId:UUID}>>`；`rollbackRelease(input:{releaseId:UUID}):Promise<ApiResult<{releaseId:UUID}>>`。数据库 RPC `save_content_draft`、`publish_content_draft`、`rollback_content_release`；`get_published_content() -> {releaseId:UUID;snapshot:ContentSnapshot}|null` 对匿名只返回当前快照；`get_content_draft(id)` 仅有效 admin/editor。发布权限、并发版本和审计都在 RPC 内校验。

- [ ] **1. 写失败测试。** `concurrent_draft_save_conflicts` 并发提交同一版本后断言 `expect(results.filter(result => result.ok)).toHaveLength(1)`，另一项 CONFLICT；`draft_never_changes_public_release` 断言保存前后公开 releaseId 相等。editor 直接调用发布 RPC 被拒绝；缺翻译/坏 ICU 字段不能发布；回滚产生新 release，旧 release 不变；审计失败时发布指针不变。
- [ ] **2. 验证失败。** Run 后台 `test -- features/content/service.test.ts` 与 `supabase test db supabase/tests/database/content.test.sql`，预期未实现 FAIL。
- [ ] **3. 实现表单与事务。** 草稿表区分 editing/submitted；发布以独立全站发布锁串行执行，读取校验后的完整三语快照。管理员和编辑共享内容工作区，运营不读草稿。非法/未经认证输入仍经服务器校验，不能只在浏览器验证；正文使用安全文本/受限富文本标记，不渲染任意 HTML。
- [ ] **4. 验证通过。** SQL、单测和 `test:e2e -- content-editor.spec.ts` PASS；错误字段定位、保留输入、冲突副本、发布/回滚记录及 60 秒生效提示完整。旧商业订单字段没有任何 UPDATE。
- [ ] **5. 提交。** `feat: add draft editing atomic publishing and rollback`。

## B3：私有素材上传、引用保护与公开交付

**Files:** Create `*_media_assets.sql`、`supabase/tests/database/media.test.sql`；后台 `features/media/{service.ts,validate.ts,MediaLibrary.tsx,UploadForm.tsx}`、`app/(protected)/media/page.tsx`、`app/api/media/{upload,complete,archive}/route.ts`、`features/media/media.test.ts`、`tests/e2e/media-library.spec.ts`；官网 `app/api/media/[assetId]/route.ts`、`tests/published-media-route.test.ts`。

**Interfaces:** `createUpload(input:{fileName:string;size:number;mime:string;profile:string}):Promise<ApiResult<{assetId:UUID;uploadUrl:string;maxBytes:number}>>`；`completeUpload(input:{assetId:UUID}):Promise<ApiResult<MediaSlot>>`；`prepareReleaseAssets(draftId:UUID):Promise<void>`；`archiveAsset(assetId:UUID):Promise<ApiResult<null>>`。数据库 `get_public_asset(asset_id)` 仅返回被有效发布历史引用的不可变副本元信息；官网 GET `/api/media/:assetId` 先核对该证明，再用服务器专用权限读固定桶内对象，不能接受任意 path/URL。

- [ ] **1. 写失败测试。** `failed_media_publish_stays_private` 注入副本复制失败，断言 `expect(publicResponse.status).toBe(404)` 且发布前后 releaseId 相等；`disguised_html_is_rejected` 断言带 HTML 文件头的 jpg 上传完成结果为 INVALID_INPUT。超限/空文件、声称尺寸与实际不符均拒绝；editor 不能公开素材；私有原件不能匿名下载；仍被历史引用的资源不能删除；已有 `/assets/` 引用无需复制。
- [ ] **2. 验证失败。** Run 后台 `test -- features/media/media.test.ts`、官网 `test -- tests/published-media-route.test.ts` 和 SQL media 测试，预期 FAIL。
- [ ] **3. 实现上传与发布引用。** 原件在私有 draft 桶，直传仅该员工被授权前缀；服务端读文件头/容器元信息核对类型和限额。发布副本也存私有不可变路径，只有发布事务记录引用后，官网公开媒体入口才允许读取，因此复制失败的孤立副本不会公开。实际限制显示给用户；后台签名预览有效期 10 分钟。
- [ ] **4. 接入媒体用途约束并验证。** manifest 对静态图、普通影片、开场/背景/透明人物视频分 profile；后者校验原用途要求的比例、时长与支持格式，配套 poster 同版本发布，不能更改时间线值。公开 URL 可缓存不可变资源；草稿预览 no-store 且不经公共图片优化器缓存。SQL、单测和浏览器上传/引用测试 PASS。
- [ ] **5. 提交。** `feat: manage private media and immutable published assets`。

## B4：官网内容适配、受保护预览与视觉回归

**Files:** Create 官网 `lib/content/{read,preview,preview-pages}.ts`、`components/content/SiteContentProvider.tsx`、`app/[locale]/preview/[draftId]/page.tsx`、`tests/content-read.test.ts`、`tests/e2e/content-publishing.spec.ts`、`playwright.platform.config.ts`；Modify 官网 `package.json`、`middleware.ts`、`i18n/request.ts`、`app/[locale]/layout.tsx`、`lib/metadata.ts`、`lib/products.ts`、`lib/cart.ts`、`lib/cart.test.ts`、`components/cart/{CartProvider,CartDrawer}.tsx`、`components/{SiteHeader,SiteFooter,ProductsShowcase,ProductDetailTemplate,OlaProductPage,OlaGoProductPage,NestProductPage,PrintProductPage,PlansContent}.tsx`、`app/page.tsx`、`app/products/tablet/page.tsx`、`components/home/{HomeFilms,MobileFilmCarousel,HomeFamily,HomeExperiences,HomeBackgrounds,HomeMotion}.tsx`、`components/home/{openingVideo,preloadOpening}.ts`。其他 manifest 所列页面已有翻译字段通过 i18n 接入；硬编码媒体按 manifest 对应文件逐项适配，具体清单随 manifest 提交并由测试检查无遗漏。

**Interfaces:** `readPublishedContent():Promise<{releaseId:UUID|null;snapshot:ContentSnapshot;source:'published'|'last-good'|'bundled'}>`；`readPreview(draftId:UUID):Promise<ContentSnapshot>` 验证有效 admin/editor；`useSiteContent():ContentSnapshot`；`resolveMediaSlot(snapshot:ContentSnapshot,slotId:string):MediaSlot`。一次请求固定同一 release；i18n messages、SEO、产品参考展示及媒体共享该请求快照，不更改 `ProductId` 或路由。官网新增 `test:e2e:platform = playwright test -c playwright.platform.config.ts`，在 4251 新建测试服务器，禁止复用旧服务器。

- [ ] **1. 写失败测试。** `publish_updates_three_locales` 断言 `await expect(page.locator('#hero-title')).toContainText(publishedTitle, {timeout:60_000})`；发布前匿名旧文案不变。`private_preview_never_leaks` 断言匿名请求不能获得 draftTitle，伪造内部预览 header 也无效；数据库失败用 last-good/初始快照，坏 schema 不覆盖；预览输出 no-store/noindex，公共图片优化器不能缓存草稿。
- [ ] **2. 验证失败。** Run 官网 `test -- tests/content-read.test.ts` 和 `test:e2e:platform -- content-publishing.spec.ts`，预期尚未接入 FAIL。
- [ ] **3. 接入内容源。** 保留 DOM 类名、图片比例、轮播槽位数、产品 ID 和动效触发结构。公开页面取消完整路由静态缓存，每次请求读取当前发布指针并以 React 请求级缓存固定整页快照，数据库请求 no-store，满足最长 60 秒生效要求；实例内只保留一份已验证 last-good 供故障回退，冷实例无此副本时使用 bundled，不依赖额外付费缓存。购物车的展示名称/参考小计与页面使用同一快照，实际下单仍由 C3 独立定价。预览路由用允许列表 page 参数选择现有页面渲染入口；中间件清除客户端传入的 `x-lumiq-preview-draft`，仅在预览路径写入草稿 ID，读取层再次验证员工后才给 i18n/内容 Provider 使用，不复制另一套首页或启用全局预览 Cookie。
- [ ] **4. 验证通过。** 新测试 PASS；运行现有 `opening-media-sync`、`opening-resize`、`product-first-load`、`products-lineup-carousel`、`home-films`、`responsive-navigation` 六组 Playwright 用例，另对 manifest 全页面做 390/1440 冒烟检查。匿名访问不能因登录中间件全站变为私有缓存或破坏语言重定向。
- [ ] **5. 提交。** `feat: connect published content and protected website previews`。后台暂停运行后官网仍能读发布内容；B 完成后再进入 C。
