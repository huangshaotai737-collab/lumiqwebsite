# 新 Codex 接力说明

2026-10-22 最新官网及后台 GitHub 审核交付见 [检查交接](docs/review-2026-10-22.md)，分支为 `codex/admin-platform-design-20261020`。两站依赖均为 Next 16.4.2，使用 Node 22 和各自锁文件。待材料边界继续以 [品牌收尾记录](docs/brand-revision-2026-10-22.md) 及其后续背景恢复指令为准。缺失项等用户补充后再继续；GitHub 源码审核交付不代表生产部署或支付开通。

先读 README.md、当前进度.md 与迁移与协作.md。真实网站在 related/website/。

从 main 开 codex/ 分支，分段修改、检查并提交。保留现有产品外形、导航、图片、视频和多语言路由。

生产部署目标是 Arpha SmartHome 团队的 lumiqwebsite，根目录 related/website，Git LFS 必须启用。

历史资料已从当前分支移除，可从清理前提交 af6637fb62fa62c9a5082612d3e625d5342112ae 恢复。旧说明中的历史项目和素材不代表当前生产配置。

不得提交密钥、登录信息或本机缓存。候补名单存储需另行配置并验证。
