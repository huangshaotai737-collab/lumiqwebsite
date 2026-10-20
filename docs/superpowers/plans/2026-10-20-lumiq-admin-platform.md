# LumiQ Admin Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立独立官网管理后台，接入真实内容、员工权限、会员、候补名单与订单，支付只预留接口。

**Architecture:** 两个独立 Next.js 应用共用 Supabase 的数据库、认证和存储，官网直接读取已发布快照。实施拆成三个子计划，每个都有可运行、可验收的交付；共同约束和接口约定由本索引固定。

**Tech Stack:** 现有 Next.js 15 / React 19 / TypeScript / next-intl；新增后台采用兼容版本，Supabase Auth/Postgres/Storage、SSR、Vitest、Playwright、SQL 权限测试。安装前核对官方现行文档和版本，实际依赖固定精确版本并提交锁文件。

**Spec:** [已确认的详细设计](../specs/2026-10-20-lumiq-admin-platform-design.md)，用户于 2026-10-20 回复 `ok` 确认。本文及三个子计划尚待用户审阅和选择执行方式。

## Global Constraints

- 官网保留在 `related/website/`；后台位于 `related/admin/`，拥有自己的依赖锁文件、启动命令、构建和部署配置。
- 后台界面使用简体中文；官网继续使用现有英文、繁体中文和日文。五款产品 ID 为 `ola`、`ola-go`、`tablet`、`print`、`nest`，`nest` 对应 Lumiq Orb。
- 保留现有官网的电脑和手机布局、动效、产品外形、五款产品和多语言路由；复杂视差、轮播、视频时序和响应式规则仍由代码维护。
- 官网已发布内容缓存最长 60 秒；草稿与会员、订单接口始终 `no-store`。失败的空数据不能覆盖已发布内容。
- 员工为管理员、内容编辑和运营三类。敏感操作按数据库中的有效员工状态校验，不信任用户可修改字段或浏览器提交的角色。
- 新图片单文件默认上限 20 MB，视频 50 MB，实际可传上限取应用限制与存储服务配置中的较小值。
- 支付本次仅预留接口；未配置渠道统一返回 `PAYMENTS_NOT_CONFIGURED`。不创建真实交易，不启用付费订阅，不申请商户账户。
- 公开购买开关初始关闭；订单初始为 `pending_payment_setup`，付款状态为未开通，配送状态为未安排。金额采用币种最小单位整数，单笔订单只包含一种币种。
- 不提交密钥、客户资料、真实环境变量、缓存或构建产物；不自动推送主分支、部署生产或创建付费项目。

## Review Focus

1. 现有云端报名表/迁移历史与本地不一致：拒绝破坏性初始化，保留已有数据；归 A2。
2. 员工被停用但旧会话仍有效：下一次后台请求拒绝，最后一位管理员不能被并发降级；归 A3/A4。
3. 三语文案的 ICU 变量/富文本标记被改坏：草稿可报告字段错误，禁止发布破坏其他语言或运行时渲染；归 B1/B2。
4. 素材发布复制中途失败或文件被假扩展名伪装：不切换公开版本、不泄露私有资源；归 B3。
5. 客户重试下单时价格或身份变化：不按浏览器金额收费、不跨会员复用幂等键、不因网络重试多单；归 C3/C4。

各条都在对应任务中有具体断言；本节不替代各子计划的功能测试。

## 文件边界与共同接口

| 路径 | 责任 |
| --- | --- |
| `related/admin/` | 独立应用；按 `features/auth`、`content`、`media`、`customers`、`waitlist`、`orders`、`team` 分模块，不建单个巨大管理组件 |
| `supabase/` | 唯一迁移历史、本地配置、种子和 SQL 测试；不把 Supabase CLI 混入官网运行时 |
| `contracts/core.ts`、`content.ts`、`commerce.ts` | 无运行时依赖的跨应用类型、状态值与错误码；不包含密钥、数据库客户端或 UI |
| `scripts/sync-platform-contracts.mjs` | 将 contracts 复制为两站 `lib/generated/platform/`；支持 `--check`，CI 比较一致性；各站可在自身根目录独立构建 |
| 两站 `lib/generated/database.ts` | 同一迁移结构生成的数据库类型；生成文件提交仓库，CI 检查漂移 |
| 官网 `lib/content/`、`components/content/` | 内容读取、验证、降级、预览上下文；原视觉组件保持原样 |
| 官网 `features/account/`、`features/orders/` | 真实登录/资料/订单界面，与本地设备演示分开 |

共同类型：`UUID = string`；`Locale = 'en' | 'zh-hant' | 'ja'`；`ProductId = 'ola' | 'ola-go' | 'tablet' | 'print' | 'nest'`；`StaffRole = 'admin' | 'editor' | 'operations'`；`Page<T> = {items:T[]; total:number; page:number; pageSize:number}`；`ApiResult<T> = {ok:true;data:T} | {ok:false;error:PlatformError;requestId:string}`，无数据成功结果使用 `ApiResult<null>`。`PlatformError` 固定包含 `UNAUTHENTICATED`、`FORBIDDEN`、`INVALID_INPUT`、`CONFLICT`、`RATE_LIMITED`、`UNAVAILABLE`、`NOT_FOUND`、`PAYMENTS_NOT_CONFIGURED`、`ORDERING_DISABLED`。`AuditSummary={id:UUID;actorId:UUID|null;action:string;entityType:string;entityId:UUID;createdAt:string}` 不含原始客户资料。

UUID/邮箱/金额等入口做运行时验证；类型断言不能替代验证。数据库函数是权限与事务的最终边界，两个应用分别封装业务函数，不互相导入 UI 或依赖对方服务器在线。

## 计划顺序

- [ ] [A：独立项目、认证与员工权限](./2026-10-20-lumiq-admin-foundation.md)，A1–A4。交付可独立登录、受权限保护并可管理团队的后台。
- [ ] [B：内容、素材与官网发布](./2026-10-20-lumiq-admin-content.md)，B1–B4。交付可预览、发布、回滚且不改变现有官网布局的 CMS。
- [ ] [C：会员、候补名单、订单与交付走查](./2026-10-20-lumiq-admin-operations.md)，C1–C7。交付真实业务流程与支付契约，完成前后台统一验收。

A → B → C 顺序实施，避免并行修改权限、迁移和共享契约。每项先写会失败的行为测试，确认失败原因，再完成最小实现、跑相应测试并提交；不把权限或金额测试替换成实现源码字符串匹配。

## 本地环境与验收命令约定

基线代码为 `351334d`，当前设计提交为 `41198c5`。执行前重新检查工作区和远端变化，不覆盖他人提交；若有新主分支提交，先评估合入再建立回归基线。继续在 `codex/` 分支开发。

目前 PATH 中检测到 Node/npm，未检测到 Docker 和 Supabase CLI。A1 必须先解决本地数据库测试环境；没有可用容器运行时不能把数据库测试标记通过。可以给出安装/启动说明，但不擅自申请付费资源。

后台本地端口默认 4250，官网新的集成测试端口 4251；保留用户现有 4242 预览。浏览器测试独立配置 `playwright.platform.config.ts`，禁止复用来源不明的旧服务器。Node 22 为 CI 运行环境，与现有官网工作流一致。

SQL 测试从仓库根目录执行固定版本 CLI 的 `supabase start`、`supabase db reset --local`、`supabase test db`；重置仅限本地测试库，不对远端生产项目运行。两个应用的检查统一使用 `npm --prefix <应用目录> run <脚本>`。

依赖安装、云端资源和任何产品代码变更均在用户审阅本计划并选择执行方式后开始。执行方式建议采用逐任务实施与独立复核，因为本项目涉及客户数据访问、发布事务和订单金额，单纯页面可用不足以证明正确。

## 计划自查记录

设计第 1–3 节对应 A1/A2/A4 及各业务界面；第 4–5 节对应 B1–B4；第 6 节对应 A3/C1；第 7 节对应 C3–C5；第 8–9 节对应 A2–A4 和各 SQL 权限测试；第 10–11 节对应 B4、各失败用例与 C7；第 12–13 节对应 C7。五项 Review Focus 均有归属任务和断言。已检查接口名称、JSON 成功空值、跨应用认证前置依赖、草稿保密、发布缓存及订单重试契约；当前只完成文档检查，尚未执行产品测试。
