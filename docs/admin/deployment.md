# 部署与生产阻断项

后续复测已完成云端内容发布/回退、第三方 Cookie 拦截时独立预览、61 张表的隔离备份恢复比对；最新后台部署为 `dpl_BWdbQwA3YohLhw1HrAeRYmFcR65f`。详见 [后续修复与复测](../../qa/reports/2026-11-03/followup-verification.md)。只读上线检查运行 `node scripts/check-live-sites.mjs`；需要本机代理的 Node 24 环境可加 `--use-env-proxy`。该命令不建立定时监控、不发送告警。

2026-11-03 更新：官网与独立后台已经接入用户当前账号下的 LumiQ 云数据库，21 个迁移已应用，云端核心联动冒烟通过。后台入口为 `https://lumiq-admin-two.vercel.app/login`；官网为 `https://lumiq-showcase-20261025.vercel.app/zh-hant`。用户已完成官网注册及邮箱验证，正式首管理员已初始化并写入审计；正式 SMTP 尚未配置，真实支付未接通。不能据此宣称全部生产功能已验收。详见 [本轮实际走查结果](../../qa/reports/2026-11-03/admin-functional-audit.md)、[本地验收](acceptance.md) 与 [使用说明](operations.md)。

## 两个独立应用

| 应用 | 构建根目录 | 安装 / 构建 | 本机公开入口 |
| --- | --- | --- | --- |
| 三语官网 | `related/website` | Vercel Node 22，`npm ci`，`npm run build` | `http://127.0.0.1:4211` |
| 简体中文后台 | `related/admin` | Node 24，`npm ci`，`npm run build` | `http://127.0.0.1:4270` |

本机启动/重启只使用 `node scripts/local-preview.mjs start` / `restart`；启动器占用公开4211/4270并转发到只监听loopback的 Next4212/4271。不要另行启动进程占用这些端口。生产的 `npm start`/Next服务必须位于已验证的外部可信代理之后，代理按下述规则覆盖身份头；直接启动 Next 不会自动提供这条信任链。

先启用 Git LFS 并拉取实际素材。各应用使用自己的精确锁文件和独立依赖安装。当前两站均使用各自锁文件中的 Next 16。构建产物、密钥、测试账号不加入 Git。原有跨操作系统 `.github/workflows/browser-platform-audit.yml` 保留；新 CI 仅使用 GitHub 托管的临时本地 Supabase 和合成账号。

## 配置与外部前提

- 两站：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、服务端 `SUPABASE_SERVICE_ROLE_KEY`（或已支持的服务端 secret）、各自精确 `APP_ORIGIN`。服务端密钥只限服务端；绝不能放入 NEXT_PUBLIC 变量或前端 bundle。
- 官网候补报名存储还必须设置服务端 `SUPABASE_URL`，与该部署的 `NEXT_PUBLIC_SUPABASE_URL` 指向同一受控项目；此适配器要求 `SUPABASE_SERVICE_ROLE_KEY`。不能依赖启动 shell 恰好提供端点。
- 限流：两站共同的高熵 `REQUEST_LIMIT_SALT`；生产可信代理覆盖/清除客户端提交的身份头。Vercel 使用其覆盖的 `x-vercel-forwarded-for`，设置 `REQUEST_IP_HEADER=x-vercel-forwarded-for`；自建代理仅在验证覆盖规则后使用 `x-real-ip`。需要独立验证代理拓扑，不能把本地请求头测试当作生产信任链验证。部署时验证 pg_cron/限流过期清理。
- 后台草稿入口：`WEBSITE_ORIGIN` 指向受控官网。官网和后台分别登录，没有跨站共享 session 的假设。Auth 域名与 `/auth/callback` 白名单精确配置；正式 HTTPS 下 cookies 必须 secure。两个独立 vercel.app 站点启用内嵌预览时，官网设置精确 `ADMIN_ORIGIN` 与 `NEXT_PUBLIC_EMBEDDED_STAFF_PREVIEW=1`，使官网 Cookie 使用 Secure/SameSite=None；后台会话保持 Lax。预览仅允许指定后台嵌入，账号页仅允许同源嵌入，所有写操作仍校验 Origin。浏览器彻底禁用第三方 Cookie 时，独立新窗口的已保存草稿预览仍可用；Safari/真实手机此项尚未验收。生产注册确认和重置邮件由 Supabase Auth SMTP 设置承担。
- 员工邀请 SMTP：`SMTP_HOST`、`SMTP_PORT`、可选认证 `SMTP_USER` / `SMTP_PASSWORD` 与发件人 `STAFF_INVITE_FROM`。正式 SMTP、发件域 DNS、可投递性、限额均未验证。本地邮件仅由 Mailpit 接收，见 [auth-email-setup.md](auth-email-setup.md)。
- 媒体：服务器可执行的 `MEDIA_FFPROBE_PATH`；运营方确认准确的 `MEDIA_STORAGE_MAX_BYTES`。图片默认20 MB、视频50 MB，实际取应用与存储上限较小者。两个固定桶均为 private；碰撞失败关闭。部署机内存、带宽、超时需按实际配置验收：公开 Range 响应当前会先读取完整对象，最大50 MiB，并非无限流式能力。透明 WebM、Safari MOV、海报配对与 settled 组仍只读，详见 [media.md](media.md)。
- 首管理员：按 [bootstrap.md](bootstrap.md) 的只允许当前已验证邮箱的人工 CLI 流程创建；没有默认生产账号。员工可用性及角色由数据库当前状态决定。

## 迁移、备份与回退

唯一迁移目录为根 `supabase/migrations/`。首次远端操作前，由操作者取得实际迁移原文 SHA-256、迁移表、结构/RLS 清单和可恢复备份，运行 `node scripts/check-migration-baseline.mjs --remote-manifest /绝对路径/remote-baseline.json`。未知表、缺失校验和、非连续迁移及结构漂移必须先人工核对。此检查不会授权远端 push/reset。

上线前验证数据库备份与恢复演练，并分别保存 Auth、Storage 对象、应用环境配置和不可变内容版本的恢复路径。不能把 SQL 表备份等同于 Storage 文件备份。数据库回退采用经审阅的向前修复迁移；不得清空账目、审计或已执行迁移历史。内容错误可以回退到已发布历史版本，生成新发布记录；应用版本回退需确认当前数据库兼容。保留旧版本构建与配置，使用相同的可恢复发布切换程序。

## 尚未通过的生产门槛

当前 Vercel HTTPS 入口、云数据库角色门禁、50 MiB 桶上限和实际图像/视频校验已冒烟验证。正式自有域名、员工邀请与找回密码的邮件投递、正式 SMTP、对象存储与角色/授权等完整灾备恢复、最大素材负载预算、告警与运维责任人、商业价格/条款/退换货承诺确认、隐私保留策略及人工擦除范围仍需验收。公开发布/回退业务流程已在隔离环境和本轮云端受控测试通过；追加素材迁移前的数据库备份已恢复到隔离库，61 张表逐行比对通过，完整灾备仍不在该证据范围。

公开下单初始关闭；五个 SKU 币种和价格为 NULL，未确认、未启用。支付适配器始终返回 `PAYMENTS_NOT_CONFIGURED`，没有通知入口、真实交易或付费订阅。支付接通材料见 [payment-integration.md](payment-integration.md) 与 [台湾主体支付准备清单](https://github.com/huangshaotai737-collab/lumiqwebsite/blob/cc11b0a124f59a0955ede33e084b960be3dfff11/docs/superpowers/specs/2026-10-20-lumiq-payments-readiness.md)。不得把技术预留视为商户准入或结算可用。

隐私策略保持 disabled / unconfirmed（false / NULL）。仅管理员可请求/恢复任务；生产保留范围必须由数据负责人确认后由数据库 owner 配置。第三方身份提供者/MFA 等未支持范围需人工处理；备份、服务商日志、独立报名、历史导出不在应用匿名化范围，详见 [customer-data.md](customer-data.md)。


### 最终修复迁移与策略版本

本次新云库已包含追加迁移 `20261020223000_final_review_boundaries.sql`；其他部署仍须按既有备份/迁移清单要求审核并应用，同时部署两站的规范合约副本及后台校验策略 `legacy-slots-v2-20261020`。旧后台策略凭据在新数据库策略下会失败关闭；不要把应用升级与数据库策略升级分离为长期状态。空 assetId 的媒体引用由不可由客户端修改的槽位原始映射验证；已发布受控素材的同槽位归档继承和已证明历史回退保持支持。不得通过 caller flag 或任意历史出现记录放宽原始媒体限制。运行时应收集限频内容回退告警；本地成功不代替生产告警管道验收。

## Vercel 后台构建（2026-11-03）

部署上传保留仓库结构，Vercel 项目 Root Directory 为 `related/admin`。根 `scripts/` 与 `contracts/` 是构建所需上下文，不能只上传后台子目录。Node 24，区域东京 `hnd1`，配置见 `related/admin/vercel.json`。

构建脚本 `scripts/prepare-vercel-media.mjs` 下载 `scripts/ffprobe-linux.json` 指定的 Linux x64 FFprobe，核对 SHA-256、保留许可证并验证可执行性；仅在构建期运行。`/api/media/complete` 追踪该文件。按本仓库部署目录配置 `MEDIA_FFPROBE_PATH=/var/task/related/admin/vendor/ffprobe`，本次已用合成 PNG 与 H264 MP4 的真实云端上传完成请求验证运行路径及私有预览；最大尺寸、长视频与负载预算仍需独立验收。未配置时保持失败关闭，不信任浏览器自行提交的媒体元数据。

新数据库首次迁移必须包含 `20261103180000_tablet_media_compatibility.sql`，支持两个已交付 Tablet 场景图，同时保留旧素材用于回退。奖励目标截图另有追加迁移 `20261103200000_reward_goals_replacement.sql`，与应用中同槽位新旧 URL 兼容一起部署。不要删掉历史迁移或重置旧库。


## 当前云端归属与版本

用户确认将资源改建到当前 CLI 登录账号。组织 LumiQ：`vnvcxfirjcumksrlgohs`；项目 `lumiq-platform`：`hkozorbnovbuccwcijzj`；东京 `ap-northeast-1`。使用免费默认 Nano 规格，未升级付费计划。原不可访问团队里的项目未迁移、未删除。新库在确认空结构后执行迁移，未运行远端 reset 或演示种子。

- 后台生产部署：`dpl_BWdbQwA3YohLhw1HrAeRYmFcR65f`，Node 24、hnd1。
- 官网生产部署：`dpl_HRp5iK199QRHrA4WLDiJSdfbyHMX`，保留原项目 Node 22 和区域配置。
- 管理后台日期显示统一使用 Asia/Shanghai，避免服务器与客户端时区差异引发重新渲染。
- 所有服务密钥只写入 Vercel 服务端环境；不在仓库或报告记录。
- 合成账号、测试草稿、媒体对象和候补记录已按本轮精确 ID 清理；不可变操作审计保留。真实用户注册不在清理范围。

首管理员开通复核：指定用户的邮箱已确认、资料 active、员工角色 admin 且 active，`team.bootstrap` 审计存在。未使用或保存用户提供的密码，未绕过邮箱确认。官网与后台分别登录；用户可以用自己设置的凭据登录后台。
