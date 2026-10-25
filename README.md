# LumiQ 官网

官网位于 `related/website/`，独立控制中台位于 `related/admin/`，两站共用根目录的合约与数据库迁移。生产分支为 `main`。

## 本机最新验收版本（2026-10-25）

本轮官网与后台走查、修复和证据见 [追加修复与最终报告](qa/reports/2026-10-25/followup-report.md)（[首轮历史报告](qa/reports/2026-10-25/detailed-report.md)）、[147项品牌清单状态](qa/reports/2026-10-25/brand-status.csv) 和 [测试矩阵](qa/reports/2026-10-25/test-matrix.csv)。本次仅更新本机并在当前 `codex/` 分支保存提交，没有推送 GitHub 或部署生产。

官网入口：http://127.0.0.1:4211/zh-hant；后台入口：http://127.0.0.1:4270/login。原本地账号、草稿与数据库保留。最终构建源码 SHA-256 为 `fe61b33b24f26d6cee480ee93b7ecb0386f79f83da324660f90a239c784b33e8`，追加修复基线提交为 `e843c60c1ce66e3cd0fb24c92ae7aad6833e5f4f`。

原品牌147项中，114项在注明范围内完成（77.6%），24项待材料或外部验收，9项待设计、范围或进一步验证。手机限速首屏 LCP 为1.52–1.70秒、中位1.696秒（本机实验室样本）；正式邮件、生产环境、真实设备等验收尚未完成，不作为无条件上线结论。全站原背景保留，没有新增阅读底色。

[飞书原清单及红框截图](https://hcnbsg6ttb3t.feishu.cn/docx/AhN4dg0iqoJ3kHxV9kIcys92nn3) · [代办](https://hcnbsg6ttb3t.feishu.cn/docx/UCFgdKhn2orJcXxgOiWcmPn9nVd)

## 仓库交接记录（2026-10-22）

最新版官网、独立后台、共用合约及数据库迁移统一位于 [`codex/admin-platform-design-20261020`](https://github.com/huangshaotai737-collab/lumiqwebsite/tree/codex/admin-platform-design-20261020) 审核分支。检查人员请先阅读 [运行与检查交接](docs/review-2026-10-22.md)。源码检查交付不代表生产部署或真实支付验收。

- Vercel 项目：`lumiqwebsite`
- Project ID：`prj_kojNA8sErpfLjpXGo1jfimbVUSCF`
- 生产地址：https://lumiqwebsite.vercel.app/en
- Framework：Next.js
- Root Directory：`related/website`
- Git LFS：必须启用；更改后需要创建新部署。
- 构建及输出目录：使用 Next.js 默认设置，不覆盖。

## 本地运行

当前审核分支两站均使用 Next.js 16.4.2，使用 Node 22；后台项目独立。2026-10-22 品牌收尾见 [实施记录](docs/brand-revision-2026-10-22.md)，最新源码检查与验证边界见 [2026-10-25验收报告](qa/reports/2026-10-25/detailed-report.md)，原部署交接见 [检查交接](docs/review-2026-10-22.md)。

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

## 本地目录精简（2026-10-22）

当前目录保留官网、控制中台及其运行资源，包含 18 组响应式图片和必要字体许可。未引用的旧图片与视频、历史截图、过期生成脚本和重复交接文件已移除。运行条件与当前进展统一在本文件及 [最新检查交接](docs/review-2026-10-22.md) 维护。

数据库迁移、CMS 初始快照、字段 ID、媒体绑定及两站各自需要的共用合约副本保留完整。需要查看旧记录或素材时，可从清理前提交 `cc11b0a124f59a0955ede33e084b960be3dfff11` 恢复。

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

## 官网与控制中台

后台功能与使用入口见 [后台说明](docs/admin/README.md)。本地官网 4211、后台 4270 由 `node scripts/local-preview.mjs start|stop|status` 管理；首次使用需要按 [初始化说明](docs/admin/bootstrap.md) 配置数据库和账号。新下载的源码不包含原机器的凭据、草稿或业务数据。

统一验收 `node scripts/verify-platform.mjs` 在交付预览已初始化或有用户数据时会拒绝执行 SQL／浏览器 fixture；再次完整验收需新的可丢弃源码副本和独立 Docker 环境。

当前内容编辑支持嵌入网页点选、临时实时预览、设备／语言切换及插图、商品图替换，见 [可视化编辑说明](docs/admin/visual-editor-2026-10-21.md)。全站保留用户确认的原背景；品牌缺失材料、生产配置和真实设备待验收项见 [品牌收尾记录](docs/brand-revision-2026-10-22.md) 与 [部署说明](docs/admin/deployment.md)。
