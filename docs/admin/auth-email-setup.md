# 会员认证与邮件配置

官网使用独立 `lumiq-website-auth` Cookie、Supabase PKCE 邮件确认与密码恢复。`APP_ORIGIN` 必须为受信任的完整源（协议、主机和端口），不能来自可编辑的 CMS siteUrl。将对应 `/auth/callback` 添加到 Supabase Auth Redirect URLs；邮件中保留完整 `redirect_to`、`locale` 和安全站内 `next`。初次注册必须启用邮箱确认，不应关闭确认来绕过邮件配置。公开注册只创建普通身份，不能创建员工或权益。

官网服务端配置 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SERVICE_ROLE_KEY`（仅服务端）和至少 32 字符 `REQUEST_LIMIT_SALT`。所有实例和后台使用同一盐及共享数据库限流 RPC。注册、重置分别每 IP 每 15 分钟 5 次。只有受信任入口覆盖并阻止直连时才配置 `REQUEST_IP_HEADER=x-real-ip` 或 `x-vercel-forwarded-for`；未配置时采用共享保守桶，不信任任意浏览器转发头。

生产需在 Supabase Auth 配置已验证的自有 SMTP 发件域名、发件地址、主机、端口、认证及供应商要求的 DNS。实际配置并验证投递前，不能宣称正式邮箱已经联通。应用不返回邮箱是否已注册；使用同样的发送反馈。临时供应商故障与限流会显示三语系统反馈。确认/恢复链接须在发起请求的同一浏览器打开，因为其他浏览器没有 PKCE verifier。过期、已使用或缺失 code 会显示重新索取链接的提示。密码更新后注销现有会话并要求重新登录。

本地只用根目录 `supabase/` 的 `lumiq-platform`，邮件被 Mailpit 捕获（UI/API54324、SMTP54325），不向真实外部邮箱投递。当前本地 Auth 白名单官网端口4211；账号浏览器验收使用隔离代码副本，无需修改已有预览或 `.env.local`。忽略目录中的 `a3.env` 由本地 `supabase status` 生成，不能打印或提交。运行：

```sh
npm --prefix related/website run test:e2e:account -- account-auth.spec.ts
```

该独立配置拥有 account-auth.spec.ts（桌面/手机），platform 配置排除该文件。C7 顺序运行 platform 和 account 两组；不要同时启动重复端口。它会验证真实本地注册、Mailpit链接、Auth code交换、Cookie、匿名隔离、本人RLS、地址保存、恢复和退出。`requireVerifiedUser()` 为订单写入提供已验证且有效的本人身份门禁，订单模块必须在写入之前调用；`requireUser()` 返回 `emailVerified`，不把未验证身份默认为已验证。

历史会员演示文案与字段完整保存在原种子中；171项仅用于旧演示的字段在精确退役账本中列明原因和替代入口，并从后台编辑字段清单隐藏。原4396历史字段/111媒体槽保持；活跃清单4225字段（其中3525项可编辑，仍按角色过滤）。当前会员系统、安全反馈及地址标签由三语代码维护。设备卡仅展示仍有效的品牌图片和名称，没有配对、控制或付费权益。
