# Lumiq Studio 网站

当前部署说明以仓库根目录 README.md 为准。生产项目 lumiqwebsite，Root Directory 为 related/website，Git LFS 必须启用。

## 本地开发与检查

```bash
cd related/website
npm ci
npm run dev -- --port 4186
```

完整验收命令：

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
```

重新生成网页发布图片：

```bash
npm run optimize-images
```

原始设计素材不得覆盖；网页使用 `public/assets/web/` 中由 Sharp 自动生成的压缩版本。

## 产品与地址

| 地址               | 产品          | 价格关系                  |
| ------------------ | ------------- | ------------------------- |
| `/products/ola`    | Lumiq Ola     | USD 599                   |
| `/products/ola-go` | Lumiq Ola Go  | 随 Ola 提供，暂不单独标价 |
| `/products/tablet` | Lumiq Tablet  | USD 399                   |
| `/products/print`  | Lumiq Print   | USD 69                    |
| `/products/nest`   | Lumiq Nest 15 | 价格待确认                |

旧地址采用永久跳转：

- `/products/pal` → `/products/ola`
- `/products/book` → `/products/print`

英文、繁体中文和日文分别使用 `/en`、`/zh-hant`、`/ja` 前缀。产品正式名称、地址、价格和简介统一维护在 `lib/products.ts`。

## Supabase 候补名单

候补名单外部接口为 `POST /api/waitlist`。它会规范化邮箱、阻止重复记录、忽略隐藏防机器人字段，并把数据库错误转换为通用服务错误。

配置方法：

1. 在 Supabase 项目中运行 `supabase/migrations/20260826165924_create_waitlist_signups.sql`。
2. 复制 `.env.example` 为本地私密环境文件。
3. 配置 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY`。
4. 在 Vercel 的 Preview 环境配置相同变量。

私密密钥不得使用 `NEXT_PUBLIC_` 前缀，不得写进代码、说明文件或提交记录。数据表只保存邮箱、来源、同意版本和登记时间；浏览器不能直接读取或写入数据表。

## 内容状态

当前预览保留了未确认样稿。注意：`DraftNotice` 目前返回空内容，部分法律与地址的草稿提示实际不可见；产品详情自己的状态说明仍在。本轮仅列出此问题，未擅自改动其他页面。正式上线前必须确认：

- 社交媒体地址、媒体报道、评价姓名和公司注册地址。
- 配送地区、退货、保修、儿童安全、定位、SOS、照护和陪伴能力。
- 隐私、条款、Cookie 和儿童安全页面的最终法务文本。
- 是否发送登记确认邮件、是否向内部团队发送通知、正式退订机制和邮件服务。

媒体及法律草稿页面在确认前设置为不收录。多语言由独立任务维护，后续合并不得删除语言路由或翻译资料。

## 主要目录

```text
app/                  页面、接口和全站样式
components/           导航、页脚和共享组件
lib/products.ts       统一产品资料源
lib/waitlist.ts       候补名单校验与业务规则
public/               原始素材和网页发布图片
scripts/              可重复运行的图片处理脚本
supabase/migrations/  数据库结构迁移
tests/                单元测试和页面流程测试
messages/             多语言文案
```

## Vercel 部署

推送 main 自动部署生产；其他分支可用于预览。若没有可重新部署的记录，在 Deployments 菜单选择 Create Deployment 并选择分支。

历史设计资料已移至 Git 历史。图片再生成脚本可能依赖这些历史母版；正常 npm run build 不依赖历史目录。
