# LumiQ 官网

正式网站代码位于 `related/website/`，生产分支为 `main`。

## 最新官网与后台检查版本（2026-10-22）

最新版官网、独立后台、共用合约及数据库迁移统一位于 [`codex/admin-platform-design-20261020`](https://github.com/huangshaotai737-collab/lumiqwebsite/tree/codex/admin-platform-design-20261020) 审核分支。检查人员请先阅读 [运行与检查交接](docs/review-2026-10-22.md)。下面的历史交付记录保留其当时状态；本次 GitHub 审核交付不代表生产部署或真实支付验收。

- Vercel 项目：`lumiqwebsite`
- Project ID：`prj_kojNA8sErpfLjpXGo1jfimbVUSCF`
- 生产地址：https://lumiqwebsite.vercel.app/en
- Framework：Next.js
- Root Directory：`related/website`
- Git LFS：必须启用；更改后需要创建新部署。
- 构建及输出目录：使用 Next.js 默认设置，不覆盖。

## 本地运行

当前审核分支两站均使用 Next.js 16.4.2，使用 Node 22；后台项目独立。2026-10-22 品牌收尾见 [实施记录](docs/brand-revision-2026-10-22.md)，最新源码检查与验证边界见 [检查交接](docs/review-2026-10-22.md)。

```sh
git lfs install
git clone --branch codex/admin-platform-design-20261020 https://github.com/huangshaotai737-collab/lumiqwebsite.git
cd lumiqwebsite
git lfs pull
cd related/website
npm ci
npm run build
npm start
```

检查命令：`npm test`、`npm run typecheck`、`npm run lint`、`npm run check:i18n`。

## 部署

推送 `main` 会触发生产构建。如果项目没有现存部署，使用 Vercel 的 Deployments → ⋯ → Create Deployment → main；不要使用 Redeploy。

## 2026-09-29 部署清理

已从当前分支移除网站目录之外的历史生成文件、设计试稿、原始素材、浏览器截图、旧提案项目、聊天导出和打包工具。所有网站源代码、运行资源、测试和数据库迁移均保留。

这些历史资料仍可从清理前的提交 `af6637fb62fa62c9a5082612d3e625d5342112ae` 恢复，未重写或清除 Git 历史。旧进度记录中的历史路径可在该提交查看。

候补名单生产存储仍需配置：参考 `related/website/.env.example` 和 Supabase 数据库迁移。未配置真实存储时，不能声称报名邮箱已保存。不得提交账号、令牌或真实环境变量。

## 共用数据库与本地后台

官网 `related/website/` 与独立后台 `related/admin/` 共用根目录 `supabase/` 的数据库迁移。
历史 `20260826165924_create_waitlist_signups.sql` 已原样移至 `supabase/migrations/`，不要在官网目录另建迁移历史。
数据库私有辅助函数放在 `private` schema；Data API 仅暴露 `public` 和 `graphql_public`，部署时必须保留这一边界。

本地使用 Supabase CLI 2.121.0 和 Docker（PostgreSQL 17）：

```sh
supabase start
supabase db reset --local
supabase test db
node --test scripts/tests/*.test.mjs
# Destructive only to synthetic local lumiq-platform data; tests baseline → actual upgrade:
node scripts/test-migration-preservation.mjs --local-test-only
supabase gen types typescript --local > related/website/lib/generated/database.ts
cp related/website/lib/generated/database.ts related/admin/lib/generated/database.ts
```

仅在本地运行 `db reset --local`。`seed.sql` 不创建默认员工或真实用户；邮件由本地 Mailpit 捕获（54324）。
本地 Auth 白名单包含后台 4250 与官网 4211 的 `/auth/callback`；部署到其他域名或端口前核对跳转白名单。
身份资料由 Auth 插入触发器创建；普通会员仅可读本人资料、修改姓名/语言/收件资料，不能自改 `access_state`、员工角色或在职状态。
`private.current_staff_role()` 每次读取有效员工和有效资料状态，不采用用户 metadata 或令牌角色作为员工授权来源。
审计允许管理员读取完整列表；内容编辑只读本人 content./media. 操作，运营只读本人 waitlist./orders./customers. 操作。日志拒绝更新、删除和清空。
`private.append_audit()` 仅供已独立完成权限与对象校验的 postgres 所有者业务函数调用，须与业务操作同一事务执行；不向浏览器或 `service_role` 授予调用权。
操作者由 `auth.uid()` 取得，普通会员订单也可由受保护业务函数记录；空操作者仅允许 `team.bootstrap` 或明确的 `system.*` 流程。
动作采用 `content.`、`media.`、`team.`、`waitlist.`、`orders.`、`customers.`、`settings.` 前缀，摘要仅存必要变更，不写密码、令牌或多余个人信息。

任何远端操作前，先只读导出迁移历史、每个已执行 SQL 文件的 SHA-256 及 `public` 业务表结构清单，人工核实环境和备份，再运行：

```sh
node scripts/check-migration-baseline.mjs --remote-manifest /absolute/path/remote-baseline.json
```

清单格式如下（SHA-256 必须来自实际执行的迁移原文，不能用本地文件冒充远端证据）：

```json
{
  "migrations": [{"version": "20260826165924", "sha256": "<64 lowercase hex characters>"}],
  "tables": {
    "public.waitlist_signups": {
      "columns": {"id": "uuid", "email": "text", "source": "text", "consent_version": "text", "created_at": "timestamp with time zone"},
      "primaryKey": ["id"], "unique": [["email"]], "rlsEnabled": true
    }
  }
}
```

清单需包含全部 `public` 业务表；`columns` 使用 PostgreSQL `format_type` 的类型名，`primaryKey`/`unique` 不重复包含主键，字段顺序按约束定义。
已执行身份迁移时，还须提供 `profiles`、`staff_memberships`、`audit_events` 的同结构描述（预期结构见检查器内定义）；后续新增业务表时同步扩充清单校验。
检查器离线只读，不连接数据库、不执行 DDL；未知远端迁移、缺失校验和、迁移非连续前缀、未跟踪的候补名单或表结构漂移都会以非零退出。
如原项目有表但没有完整迁移历史或原始 SQL 证据，必须先人工核对和补齐基线；检查通过也不自动授权任何远端 push/reset。
员工邀请、首管理员 CLI、SMTP 配置与设置归属参见 [后台初始化说明](docs/admin/bootstrap.md)。团队邀请只在同一已确认邮箱显式接受后授权；系统配置状态不返回密钥，公开联系方式由后续版本化内容设置统一管理。
已执行 staff_management 迁移时，基线清单还须包含 staff_invites 全部字段及 RLS/主键描述（精确结构见检查器）；未知表或字段漂移继续失败关闭。
当前仅验证本地合成账号和数据，尚未验收生产数据库、正式邮件或真实候补名单存储。

### 会员与候补名单运营（C2）

后台 `/customers`、`/waitlist` 仅开放给数据库中当前有效的管理员与运营。会员邮箱通过受限 RPC 读取；普通会员和编辑不能列出邮箱或内部备注。员工（包括已停用员工）与已匿名化会员不进入客户列表，也不能通过详情或备注接口访问。会员普通资料接口不包含邮箱扩展或内部备注。

列表从第1页开始，默认25条、最大100条，按创建时间与ID倒序稳定排序，搜索按字面子串匹配。候补处理状态、最多2000字备注及乐观版本单独保存在 `waitlist_operations`，原报名邮箱、来源、同意版本和重复报名语义保持不变。保存版本过期返回 `CONFLICT`。新增会员内部备注保存在 `customer_notes`，详情显示最近100条。

CSV 导出忽略分页，覆盖当前搜索与状态筛选范围；超过10000条返回 `INVALID_INPUT`，需要收窄筛选。数据库在同一事务中检查当前角色、读取范围、限制每员工每小时5次并写入范围审计，任一步失败都不会返回CSV。审计只包含状态、是否搜索、行数、上限与排序，不记录邮箱或原始搜索词。CSV 使用UTF-8 BOM、RFC4180转义并保护公式前缀。

官网真实报名需要同时配置原有服务端Supabase存储和 `APP_ORIGIN`、共享 `REQUEST_LIMIT_SALT` 及可信IP入口策略；报名默认每IP每15分钟5次，缺少限流配置或数据库不可用时失败关闭。原有限流清理任务也清理新增的报名与导出计数；导出1小时窗口最多保留到到期后下一次15分钟清理。生产配置与真实存储仍须独立验收。

本地专用浏览器贯通：`npm --prefix related/admin run test:e2e:operations`（读取忽略的本地合成凭据，隔离运行4262/4263，不使用正式预览进程）；SQL测试：`supabase test db supabase/tests/database/customer-operations.test.sql`。所有迁移仍由根目录 `supabase/migrations/` 唯一管理。

## 独立后台本地交付（2026-10-20）

后台实现位于 `related/admin/`，三语官网仍位于 `related/website/`。用户已批准全部实施任务；本分支未推送、未上线、未开通支付。详见 [验收状态](docs/admin/acceptance.md)、[本地启动与私有账号位置](docs/admin/operations.md)、[部署阻断项](docs/admin/deployment.md)、[依赖安全状态](docs/admin/security-status.md) 和 [逐项决策记录](docs/admin/decisions.md)。

本地官网4211、后台4270由 `node scripts/local-preview.mjs start|stop|status` 管理；凭据仅保存在忽略的 `.lumiq-local/preview-credentials.json`。请勿把破坏性 setup 命令当成重启。统一验收 `node scripts/verify-platform.mjs` 在交付预览已初始化或有用户数据时会拒绝执行SQL/浏览器 fixture；再次完整验收需新的可丢弃源码副本和独立 Docker 环境。

官网内容工作区新增嵌入网页点选编辑、未保存内容实时预览、设备／语言切换及插图、商品图替换；完整字段与原发布权限保留。配置、使用方式与本轮验证范围见 [可视化编辑说明](docs/admin/visual-editor-2026-10-21.md)。

2026-10-21 已进行新一轮官网/后台走查，修复六项确认问题，保留一项视频轮播间歇性性能风险；完整缺陷、重跑结果与未覆盖范围见 [走查结论](docs/admin/audit-2026-10-21.md)。原实施记录继续保留，不将历史结果冒充本轮全量通过。修复仅在本地分支和本地预览，未推送或云端部署。

同日按品牌修改清单完成首轮内容与布局调整：Orb、Tablet 成长地图、OlaGo、方案、17 题 FAQ、三语文案与后台编辑字段同步。明确完成项、缺失素材和本轮验证边界见 [品牌清单实施记录](docs/brand-revision-2026-10-21.md)。本机校验策略升级为 `brand-content-v4-20261021`；未来部署须配套执行新增迁移，不能只替换后台构建。
