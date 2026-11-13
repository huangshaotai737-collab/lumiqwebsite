# LumiQ 官网

当前官网位于 `related/website/`，与 `related/admin/` 控制中台分别安装和构建。使用 Node 22、Next.js 16.4.2，以及本目录的 `package-lock.json`。完整运行条件和验证范围见 [最新检查交接](../../docs/review-2026-10-22.md)。

## 本地开发

在本目录运行：

```sh
npm ci
npm run dev -- --hostname 127.0.0.1 --port 4211
```

英文、繁中、日文入口分别为 `/en`、`/zh-hant`、`/ja`。官网和后台共用数据时，按根目录 [README](../../README.md) 与 [本地运维说明](../../docs/admin/operations.md) 配置 Supabase 和环境变量。仓库没有默认后台账号或真实环境密钥。

## 检查与构建

```sh
npm test
npm run typecheck
npm run lint
npm run check:i18n
npm run build
```

`npm run build` 会检查可视化编辑预览与公开页面源码是否一致。浏览器测试使用 `npm run test:e2e`；涉及账户、报名、订单或后台的流程需要独立测试数据库。

## 素材与内容

`public/` 保留当前页面、CMS 初始内容和后台素材配置所需的图片、视频及字体许可。`lib/home-image-manifest.json` 保存当前使用的 18 组响应式图片；每组不同宽度的文件用于适配屏幕，不能作为重复素材删除。

旧背景试稿、旧人物视频、未使用的原图、历史截图及一次性素材生成脚本已移除。需要查阅时，可从清理前提交 `cc11b0a124f59a0955ede33e084b960be3dfff11` 恢复。新生成的检查截图放在被 Git 忽略的 `qa/` 中。

CMS 初始快照、媒体配置和共用合约属于运行数据。修改内容时沿用现有编辑与发布流程，保留字段 ID 和媒体绑定。共用合约源位于根目录 `contracts/`，由 `scripts/sync-platform-contracts.mjs` 同步。

## 数据与部署

数据库迁移统一位于根目录 `supabase/migrations/`。候补名单、账户、订单等功能需配置 `.env.example` 对应变量并独立验证；静态构建成功不能证明真实数据已保存。

Vercel 项目为 `lumiqwebsite`，部署根目录为 `related/website`，生产分支为 `main`，需要启用 Git LFS。后台部署及未完成的支付、邮件和材料验收见 [部署说明](../../docs/admin/deployment.md) 与 [品牌收尾记录](../../docs/brand-revision-2026-10-22.md)。
