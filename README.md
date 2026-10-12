# LumiQ 网站｜2026-10-13 验收版

本仓库存放2026-10-13完成本地验证的LumiQ网站版本，网站代码位于 `related/website/`，包含运行所需的图片、视频与字体。

仓库地址：https://github.com/huangshaotai737-collab/lumiqwebsite

## 本版修改

- 稳定首屏在连续调整浏览器宽高时的标题、按钮及设备构图；保留完整16:9比例与原滚动进度。
- 首屏关键资源优先，后续图片、影片和3D资源接近展示区域时加载。
- 桌面全站复用随滚动渐深的背景，修复跨页缓存恢复，保护深色正文与浅色卡片的可读性；手机及减少动态模式使用静态背景。
- 桌面关怀图片区域缩小约20%，全站同层级小字采用桌面14px、窄屏13px。

本地验证：30项单元测试、13项首屏浏览器回归、21组全站背景页面/语言检查、类型及三语言文案检查、89个路由的正式构建通过。

当前购物车、订单和支付功能尚未实现；产品按钮进入候补登记页面。候补登记的真实存储需要配置Supabase后单独验证，仓库不包含真实环境变量或账号密钥。

## 下载与运行

准备Git、Git LFS及Node.js 22或更新版本。图片和影片通过Git LFS存储，下载后需要拉取实际素材。

```bash
git lfs install
git clone https://github.com/huangshaotai737-collab/lumiqwebsite.git
cd lumiqwebsite
git lfs pull
cd related/website
npm ci
npm run dev
```

打开 http://localhost:3000/zh-hant ，也可使用 `/en` 和 `/ja`。

正式运行：

```bash
npm run build
npm start
```

检查命令：`npm test`、`npm run typecheck`、`npm run lint`、`npm run check:i18n`。部署时根目录设为 `related/website`，并启用Git LFS。

## 来源

代码基于 https://github.com/arphasmarthome/lumiqwebsite/pull/2 的 `44d0f85c56e1642aaf39a272ddaf32cdb57457b1`，加上本轮本地修复，验收源码提交为 `40a847430bc6b59b569cf56dca1b49111750e78e`。本仓库保存该版本的独立快照；原项目运行与历史说明保留在 `docs/upstream-readme.md`。
