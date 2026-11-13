# 首管理员、员工邀请与配置

仅服务器运维人员可创建首管理员。先让指定邮箱在官网完成注册与邮箱确认；账号须为非匿名账号，且 profiles.access_state 为 active。CLI 不创建 Auth 用户、不设置密码、不发送邮件，也没有网站初始化入口。

在已核对目标项目并按根目录 README 完成迁移基线检查后，通过进程环境安全提供 SUPABASE_URL 与 SUPABASE_SECRET_KEY（兼容 SUPABASE_SERVICE_ROLE_KEY）。不要把密钥写进参数、提交文件或输出日志。

```sh
node scripts/bootstrap-admin.mjs --email confirmed-operator@example.test
```

数据库事务使用团队变更同一把锁；已有任何 admin 成员（包括 inactive）时拒绝重复初始化。成功时同时记录 team.bootstrap，操作者为 null。账号不存在、邮箱未确认、匿名或资料停用时拒绝。仓库没有默认管理员密码。

## 邀请

管理员在“团队与权限”填写邮箱与角色。服务器用当前已验证管理员身份、同源检查、共享写入限流和当前用户 JWT 调用数据库；不需要服务密钥来分配角色。数据库再次校验当前有效管理员。

邮件使用可配置 SMTP 服务。以下配置均只属于后台服务器环境变量：

```dotenv
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
STAFF_INVITE_FROM=
```

远程 SMTP 要求账号密码；465 使用 TLS，其余端口强制 STARTTLS，不能关闭证书验证。本地 localhost/127.0.0.1 的合成测试允许明文无认证 SMTP。未配置、连接失败或收件方拒绝会返回失败，不授予权限。邮件服务商接收邮件并不代表最终送达收件箱；退信和生产送达率须由运维另行验证。

团队邀请仅在数据库保存 256 位随机令牌的 SHA-256 摘要，有效期 48 小时。URL 的 fragment 包含原始令牌，不进入服务器请求、API 响应或审计摘要。不要转发邀请邮件。重发会撤销同邮箱旧待接受邀请；已存在员工用角色/在职操作管理，重发不会覆盖员工权限。

新用户须先在官网完成注册和邮箱确认。新旧用户均在 /invite 使用同一邮箱账号验证身份，再点击“接受邀请”。专用 POST /api/team/accept 的 action=signin 只建立普通账号会话；不自动接受邀请，也不授予员工身份。普通 /api/auth/signin 仍要求员工权限。接受时数据库核对当前 Auth 已确认邮箱、有效资料、摘要、送达状态、期限、撤销与一次性状态。

/API 返回不含原始令牌或密码；日志只记角色、状态及必要对象。变更角色或在职状态与 team.changed 审计同一事务提交，日志失败整体回滚。最后一位有效管理员禁止停用/降级，并发修改也保留至少一位。

## 设置与记录

管理员可查看完整操作记录；内容编辑只可查看自己的 content./media. 操作；运营只可查看自己的 waitlist./orders./customers. 操作。已停用员工或资料失效后下一请求拒绝，日志不能从后台更新或删除。

/settings 和 GET /api/settings 仅管理员可访问，返回配置存在与否的布尔状态，不返回密钥、不声称已验证服务连通。页面内支付材料清单可独立访问；支付仍未开通，不创建交易。官网 siteUrl/supportEmail/contactText 的唯一可写来源为后续 ContentSnapshot.settings 草稿/发布/回滚流程。A4 当前只读说明，未创建第二套 public.system_settings 数据。

## 本地验证

只在根目录本地合成 Supabase 运行测试，不向真实邮箱发送邀请：

```sh
DOCKER_HOST=unix:///Users/huangshaotai/.colima/lumiq-platform/docker.sock supabase test db
npm --prefix related/admin test
npm --prefix related/admin run test:e2e -- team.spec.ts
```

E2E 从忽略、0600 的 LUMIQ_TEST_ENV_FILE 读取本地 API_URL/ANON_KEY/SERVICE_ROLE_KEY（默认 A3 本地测试 env），并创建/清除合成账号。独立代码运行副本在忽略的 .superpowers 目录，使用 4257/4258，不修改应用 .env.local 或原预览配置。4257 的本地 SMTP 代理仅连接本地 Mailpit；4258 故意使用不可达 SMTP 验证失败。测试会删除本次 Auth 账号/资料/成员关系，但保留合成 staff_invites 发送/接受记录和不可变审计，不能把这些测试记录当作真实业务数据。C7 或后续验收需要干净演示基线时，仅对这套合成本地后端运行根目录 README 的 supabase db reset --local，再按正式种子/演示步骤初始化；不要在远端使用 reset。数据库并发测试使用两个独立 dblink 会话，仅限合成的本地数据库与默认本地认证。测试夹具清理由数据库所有者执行；业务 API 的审计不可变权限保持不变。

生产 SMTP、正式邮箱、远端迁移与部署不在本地测试验证范围。实际服务器必须设置准确 APP_ORIGIN，可信入口配置参考 A3 文档/根目录说明。新部署域名的 Auth 跳转白名单须另行核对。
