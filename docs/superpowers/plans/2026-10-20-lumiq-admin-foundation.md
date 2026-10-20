# LumiQ Admin Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付独立运行、真实登录、区分三类员工权限且可管理团队的后台。

**Architecture:** 独立 Next.js 应用和共用 Supabase Auth；数据库中的员工状态承担授权，RLS 及受限事务函数保护写入。以本地数据库完成隔离测试，不提前配置真实云端项目。

**Tech Stack:** Next.js / React / TypeScript、Supabase SSR/Auth/Postgres、Vitest、Playwright、pgTAP。

**Spec:** [详细设计](../specs/2026-10-20-lumiq-admin-platform-design.md) 第 2、3、8、9、11、12、13 节；[总计划与接口](./2026-10-20-lumiq-admin-platform.md)。

## Global Constraints

- 继承总计划全部共同约束。后台位于 `related/admin/`，拥有自己的依赖锁文件、启动命令、构建和部署配置。
- 员工分为管理员、内容编辑和运营三类；停用后下一次后台请求应被拒绝；禁止停用或降级最后一位管理员。
- 不信任浏览器提交的角色、可自行修改的用户资料或仅依赖旧令牌中的角色；高权限凭据不进入浏览器。
- 不创建付费项目，不默认生产环境已配置；工作区只在 `codex/` 分支修改。

## Review Focus

沿用总计划第 1、2 条；A2 覆盖已有报名表与迁移不匹配，A3 覆盖旧令牌停用，A4 覆盖并发降级最后管理员。

## A1：可独立运行且默认关闭管理访问的应用

**Files:** Create `related/admin/package.json`、`package-lock.json`、`tsconfig.json`、`next.config.ts`、`eslint.config.mjs`、`vitest.config.mts`、`playwright.platform.config.ts`、`.env.example`、`.gitignore`、`app/layout.tsx`、`app/globals.css`、`app/login/page.tsx`、`app/page.tsx`、`features/shell/AdminShell.tsx`；Create `contracts/core.ts`、`scripts/sync-platform-contracts.mjs`、`scripts/tests/admin-boundary.test.mjs`、`scripts/tests/contracts-sync.test.mjs`。根目录及官网包结构保持独立。

**Interfaces:** Produces 总计划共同类型及 `sync-platform-contracts.mjs [--check]`。后台 `dev` 端口 4250；提供 `test`、`typecheck`、`lint`、`build`，`test:e2e = playwright test -c playwright.platform.config.ts`，禁止复用旧服务器；缺认证配置时 `/` 显示不可用并拒绝数据访问。登录成功路由为 `app/(protected)/page.tsx`；A3 接入时移除 A1 的 `app/page.tsx`，避免两个文件争用 `/`。

- [ ] **1. 建立测试前置环境。** 读取根目录接力文档、已确认设计和总计划；核对官方包/CLI 文档后固定版本。准备可启动的本地 Supabase 与邮件捕获器，记录版本。保存原官网基线，缺容器运行时明确报告，数据库测试不作跳过通过。
- [ ] **2. 写失败测试。** Node 测试 `independent_admin_build` 从实际文件解析 pkg 并断言 `assert.equal(pkg.scripts.build, 'next build')`、独立锁文件存在、后台未引用官网 CSS、生成契约与源一致；浏览器 `unconfigured_admin_is_closed` 断言缺配置时管理入口没有会员/订单数据，登录页键盘可用。测试文件为上述两个 `.mjs` 和 `related/admin/tests/e2e/shell.spec.ts`。
- [ ] **3. 验证失败。** Run `node --test scripts/tests/admin-boundary.test.mjs scripts/tests/contracts-sync.test.mjs`，预期缺应用/契约文件导致 FAIL。
- [ ] **4. 实现独立应用与契约同步。** 只完成本任务列出的文件；不复制官网样式、视频、素材及本机 node_modules。侧栏支持折叠，工作区提供空状态，导航后续模块未实现时不显示虚构业务数据。
- [ ] **5. 验证并提交。** 两项 Node 测试及后台 `typecheck`、`lint`、`build`、`test:e2e -- shell.spec.ts` 通过，缺配置也可构建；提交 `feat: add independent admin application shell`，提交范围限本任务文件。

## A2：数据库身份、员工权限与不可变日志

**Files:** Move 原样 `related/website/supabase/migrations/20260826165924_create_waitlist_signups.sql` → `supabase/migrations/20260826165924_create_waitlist_signups.sql`；Create `supabase/config.toml`、`supabase/seed.sql`、通过 CLI 生成的 `*_admin_identity.sql`、`supabase/tests/database/identity.test.sql`、`supabase/tests/database/migration-preservation.test.sql`、`scripts/check-migration-baseline.mjs`、两站 `lib/generated/database.ts`；Modify 根目录 `README.md` 的迁移位置说明。

**Interfaces:** Produces `profiles(user_id uuid PK, display_name, locale, shipping_address jsonb, access_state text)`，access_state 为 active/suspended/anonymized，默认 active；`staff_memberships(user_id PK, role, active)`、`audit_events`、`private.current_staff_role() -> text|null`。`private.assert_staff_role(allowed text[]) -> void` 直接查询当前有效员工；私有 schema 不向浏览器数据 API 暴露。`private.append_audit(action text, entity_type text, entity_id uuid, summary jsonb) -> void` 限制调用并写入追加式日志。后续私人业务表 RLS 同时检查归属和 profile 有效状态。

- [ ] **1. 写失败 SQL 测试。** `metadata_is_not_staff_authority` 设置普通会员 claims 后断言 `select is(private.current_staff_role(), null::text, 'metadata cannot grant admin');`；匿名不能读 profiles/员工/日志，会员 A 不能读写 B，用户不能自改 role 或 access_state，日志不能由 authenticated 直接修改/删除。`preserve_existing_waitlist` 断言升级前后同一报名的 `id/email/created_at` 相等，基线检查遇到未知远端迁移返回非零且不执行 DDL。
- [ ] **2. 验证失败。** Run `supabase db reset --local` 再 `supabase test db supabase/tests/database/identity.test.sql`，预期身份表/函数尚不存在而 FAIL。
- [ ] **3. 实现迁移、RLS 与基线检查。** 原迁移不改时间戳或内容；新迁移由 `supabase migration new admin_identity` 生成。`check-migration-baseline.mjs` 只读比较本地文件和传入的远端迁移/表结构清单；未核对远端前禁止 push/reset 远端。认证用户创建资料触发器固定 `search_path`，只初始化本人普通资料。
- [ ] **4. 验证通过。** Run `supabase db reset --local`、`supabase test db`，全部 PASS；`supabase gen types typescript --local` 生成两站相同结构，角色/归属列有索引。
- [ ] **5. 提交。** `feat: add shared identity schema and database authorization`，包含迁移、SQL 测试、生成类型和接入说明，不包含真实用户种子或密钥。

## A3：真实登录、会话续期与服务器授权

**Files:** Create 后台 `lib/auth/{server,browser,require-staff}.ts`、`lib/http/{result,origin,rate-limit}.ts`、`features/auth/LoginForm.tsx`、`app/auth/callback/route.ts`、`app/api/auth/{signin,signout}/route.ts`、`app/api/session/route.ts`、`app/(protected)/layout.tsx`、`app/(protected)/page.tsx`、`middleware.ts`，Remove A1 `app/page.tsx`；Create 官网 `lib/auth/{server,browser,require-user,require-staff}.ts`、`lib/http/{result,origin,rate-limit}.ts`、`features/account/LoginForm.tsx`、`app/[locale]/login/page.tsx`、`app/auth/callback/route.ts`、`app/api/auth/{signin,signout}/route.ts`；Modify 官网 `middleware.ts`，两站 `.env.example` 更新无值键名；Create `*_request_limits.sql`、后台 `features/auth/auth.test.ts`、`tests/e2e/staff-session.spec.ts`、`supabase/tests/database/rate-limit.test.sql`。

**Interfaces:** 两站分别导出 `requireStaff(allowed:readonly StaffRole[]):Promise<{userId:UUID;role:StaffRole}>`，验证身份并复查在职状态；官网另导出 `requireUser():Promise<{userId:UUID;emailVerified:boolean}>` 并拒绝 suspended/anonymized 资料状态；`assertSameOrigin(request:Request, configuredOrigin:string):void`；`consumeRateLimit(scope:string, subject:string):Promise<{allowed:boolean;retryAfterSeconds:number}>`。数据库 `consume_request_limit(scope,subject_hash)` 原子计数，仅限受验证的服务器入口调用，保留时限不超过 24 小时；认证请求不缓存。前台登录表单通过本站 signin 路由做限流并建立 Cookie 会话，Auth 服务自身的限流同样按官方配置保留。

- [ ] **1. 写失败测试。** `disabled_staff_session_is_rejected` 以同一旧 Cookie 在停用后请求 `/api/session`，断言 `expect(response.status()).toBe(403)`；未登录 401、普通会员 403、有效员工通过；跨来源写请求 403，多实例共用限额有效。`reject_external_auth_redirect` 断言 `next=https://evil.example` 或 `//evil.example` 只回本网站安全路径，官网语言路由正常。
- [ ] **2. 验证失败。** Run `npm --prefix related/admin test -- features/auth/auth.test.ts`，预期缺授权模块 FAIL。
- [ ] **3. 实现 SSR 客户端及登录流程。** 使用官方 SSR 会话刷新方式，不用本地布尔值或只调用未核实 session 代替身份验证。官网 next-intl 匹配器除原有 api/_next 等排除项外，排除根目录 `/auth/` 回调路径，防止被重定向到不存在的语言路径。数据库限流默认登录 10 次/15 分钟/IP、写操作 60 次/分钟/用户；匿名 IP 只存加盐摘要，盐缺失时写入口关闭，信任代理规则由部署配置固定，不盲信任传入 X-Forwarded-For。
- [ ] **4. 验证通过。** 上述单测、SQL 限流测试和 `test:e2e -- staff-session.spec.ts` PASS；登录、退出、会话刷新、过期及拒绝状态有可见反馈，Cookie 不通过 URL 传递。
- [ ] **5. 提交。** `feat: secure staff login and server-side sessions`。

## A4：员工邀请、角色管理、审计与设置状态

**Files:** Create 后台 `features/team/service.ts`、`features/team/TeamTable.tsx`、`features/team/InviteForm.tsx`、`app/(protected)/team/page.tsx`、`app/(protected)/audit/page.tsx`、`app/(protected)/settings/page.tsx`、`app/api/team/{invite,accept,role,status}/route.ts`、`scripts/bootstrap-admin.mjs`；Create `*_staff_management.sql`；Test 后台 `features/team/service.test.ts`、`tests/e2e/team.spec.ts`、根目录 `supabase/tests/database/team.test.sql`；Create `docs/admin/bootstrap.md`。

**Interfaces:** `inviteStaff(input:{email:string;role:StaffRole}):Promise<ApiResult<{inviteId:UUID}>>`；`acceptStaffInvite(input:{inviteId:UUID;token:string}):Promise<ApiResult<null>>`；`changeStaff(input:{userId:UUID;role:StaffRole;active:boolean}):Promise<ApiResult<null>>`。邀请只由验证后的 admin 调用服务器管理接口；接受流程验证当前已确认邮箱与邀请、期限和单次令牌摘要一致，再经 `accept_staff_invite` 授权；公开注册不会自动接受邀请。数据库 `change_staff_membership` 锁定团队变更，防止并发删除最后一名管理员。初始化 CLI 只允许系统没有管理员时创建第一位，不在网站提供入口。

- [ ] **1. 写失败测试。** `concurrent_last_admin_demotion` 并发发起两个降级操作后 SQL 断言 `select is((select count(*)::integer from public.staff_memberships where role='admin' and active), 1, 'one admin survives');`；editor/operations 调邀请接口均 403；创建/接受邀请身份一致后才获得角色，邮件失败不授予角色。设置响应只含配置布尔状态，无密钥；日志失败则角色变更整体回滚。
- [ ] **2. 验证失败。** Run 后台 `test -- features/team/service.test.ts` 和 `supabase test db supabase/tests/database/team.test.sql`，预期功能缺失 FAIL。
- [ ] **3. 实现团队管理及后台保护导航。** 员工邀请有期限和已使用状态，重发不重复授予角色；已存在普通账号必须验证同一邮箱接受邀请。日志按设计限制查看范围。设置页只管理非敏感地址/客服信息并显示接入状态，密钥配置在服务器环境变量。
- [ ] **4. 验证通过。** 单测、SQL 和 `test:e2e -- team.spec.ts` PASS；首管理员创建、重复初始化拒绝、邀请、接受、改角色、停用及日志贯通。独立后台可构建启动，原官网仍可独立构建。
- [ ] **5. 提交。** `feat: manage staff invitations roles and audit history`。完成 A 后才能执行 B/C，不把空导航算作已实现业务模块。
