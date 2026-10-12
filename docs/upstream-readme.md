# LumiQ 官网

正式网站代码位于 `related/website/`，生产分支为 `main`。

- Vercel 项目：`lumiqwebsite`
- Project ID：`prj_kojNA8sErpfLjpXGo1jfimbVUSCF`
- 生产地址：https://lumiqwebsite.vercel.app/en
- Framework：Next.js
- Root Directory：`related/website`
- Git LFS：必须启用；更改后需要创建新部署。
- 构建及输出目录：使用 Next.js 默认设置，不覆盖。

## 本地运行

```sh
git lfs install
git clone https://github.com/arphasmarthome/lumiqwebsite.git
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
