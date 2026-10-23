# 部署与生产阻断项

本功能由用户批准实施；本分支交付的是本地实现和本地验收，未推送、未配置云端、未部署生产、未开通支付。完整验收状态见 [acceptance.md](acceptance.md)，本地使用见 [operations.md](operations.md)。

## 两个独立应用

| 应用 | 构建根目录 | 安装 / 构建 | 本机公开入口 |
| --- | --- | --- | --- |
| 三语官网 | `related/website` | Node 22，`npm ci`，`npm run build` | `http://127.0.0.1:4211` |
| 简体中文后台 | `related/admin` | Node 22，`npm ci`，`npm run build` | `http://127.0.0.1:4270` |

本机启动/重启只使用 `node scripts/local-preview.mjs start` / `restart`；启动器占用公开4211/4270并转发到只监听loopback的 Next4212/4271。不要另行启动进程占用这些端口。生产的 `npm start`/Next服务必须位于已验证的外部可信代理之后，代理按下述规则覆盖身份头；直接启动 Next 不会自动提供这条信任链。

先启用 Git LFS 并拉取实际素材。各应用使用自己的精确锁文件和独立依赖安装。官网保留 Next 15；后台 Next 16。构建产物、密钥、测试账号不加入 Git。原有跨操作系统 `.github/workflows/browser-platform-audit.yml` 保留；新 CI 仅使用 GitHub 托管的临时本地 Supabase 和合成账号。

## 配置与外部前提

- 两站：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、服务端 `SUPABASE_SERVICE_ROLE_KEY`（或已支持的服务端 secret）、各自精确 `APP_ORIGIN`。服务端密钥只限服务端；绝不能放入 NEXT_PUBLIC 变量或前端 bundle。
- 官网候补报名存储还必须设置服务端 `SUPABASE_URL`，与该部署的 `NEXT_PUBLIC_SUPABASE_URL` 指向同一受控项目；此适配器要求 `SUPABASE_SERVICE_ROLE_KEY`。不能依赖启动 shell 恰好提供端点。
- 限流：两站共同的高熵 `REQUEST_LIMIT_SALT`；生产可信代理覆盖/清除客户端提交的 `x-real-ip`，再设置 `REQUEST_IP_HEADER=x-real-ip`。需要独立验证代理拓扑，不能把本地请求头测试当作生产信任链验证。部署时验证 pg_cron/限流过期清理。
- 后台草稿入口：`WEBSITE_ORIGIN` 指向受控官网。官网和后台分别登录，没有跨站共享 session 的假设。Auth 域名与 `/auth/callback` 白名单精确配置；正式 HTTPS 下 cookies 必须 secure。生产注册确认和重置邮件由 Supabase Auth SMTP 设置承担。
- 员工邀请 SMTP：`SMTP_HOST`、`SMTP_PORT`、可选认证 `SMTP_USER` / `SMTP_PASSWORD` 与发件人 `STAFF_INVITE_FROM`。正式 SMTP、发件域 DNS、可投递性、限额均未验证。本地邮件仅由 Mailpit 接收，见 [auth-email-setup.md](auth-email-setup.md)。
- 媒体：服务器可执行的 `MEDIA_FFPROBE_PATH`；运营方确认准确的 `MEDIA_STORAGE_MAX_BYTES`。图片默认20 MB、视频50 MB，实际取应用与存储上限较小者。两个固定桶均为 private；碰撞失败关闭。部署机内存、带宽、超时需按实际配置验收：公开 Range 响应当前会先读取完整对象，最大50 MiB，并非无限流式能力。透明 WebM、Safari MOV、海报配对与 settled 组仍只读，详见 [media.md](media.md)。
- 首管理员：按 [bootstrap.md](bootstrap.md) 的只允许当前已验证邮箱的人工 CLI 流程创建；没有默认生产账号。员工可用性及角色由数据库当前状态决定。

## 迁移、备份与回退

唯一迁移目录为根 `supabase/migrations/`。首次远端操作前，由操作者取得实际迁移原文 SHA-256、迁移表、结构/RLS 清单和可恢复备份，运行 `node scripts/check-migration-baseline.mjs --remote-manifest /绝对路径/remote-baseline.json`。未知表、缺失校验和、非连续迁移及结构漂移必须先人工核对。此检查不会授权远端 push/reset。

上线前验证数据库备份与恢复演练，并分别保存 Auth、Storage 对象、应用环境配置和不可变内容版本的恢复路径。不能把 SQL 表备份等同于 Storage 文件备份。数据库回退采用经审阅的向前修复迁移；不得清空账目、审计或已执行迁移历史。内容错误可以回退到已发布历史版本，生成新发布记录；应用版本回退需确认当前数据库兼容。保留旧版本构建与配置，使用相同的可恢复发布切换程序。

## 尚未通过的生产门槛

正式域名/HTTPS/可信入口、云端数据库与 RLS 冒烟、SMTP、备份恢复、存储限额与资源预算、告警与运维责任人、商业价格/条款/退换货承诺确认、隐私保留策略及人工擦除范围均需正式验收。

公开下单初始关闭；五个 SKU 币种和价格为 NULL，未确认、未启用。支付适配器始终返回 `PAYMENTS_NOT_CONFIGURED`，没有通知入口、真实交易或付费订阅。支付接通材料见 [payment-integration.md](payment-integration.md) 与 [台湾主体支付准备清单](https://github.com/huangshaotai737-collab/lumiqwebsite/blob/cc11b0a124f59a0955ede33e084b960be3dfff11/docs/superpowers/specs/2026-10-20-lumiq-payments-readiness.md)。不得把技术预留视为商户准入或结算可用。

隐私策略保持 disabled / unconfirmed（false / NULL）。仅管理员可请求/恢复任务；生产保留范围必须由数据负责人确认后由数据库 owner 配置。第三方身份提供者/MFA 等未支持范围需人工处理；备份、服务商日志、独立报名、历史导出不在应用匿名化范围，详见 [customer-data.md](customer-data.md)。


### 最终修复迁移与策略版本

上线前仍须按既有备份/迁移清单要求审核并应用追加迁移 `20261020223000_final_review_boundaries.sql`，同时部署两站的规范合约副本及后台校验策略 `legacy-slots-v2-20261020`。旧后台策略凭据在新数据库策略下会失败关闭；不要把应用升级与数据库策略升级分离为长期状态。空 assetId 的媒体引用由不可由客户端修改的槽位原始映射验证；已发布受控素材的同槽位归档继承和已证明历史回退保持支持。不得通过 caller flag 或任意历史出现记录放宽原始媒体限制。运行时应收集限频内容回退告警；本地成功不代替生产告警管道验收。
