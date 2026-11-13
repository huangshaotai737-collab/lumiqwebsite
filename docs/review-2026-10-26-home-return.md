# 首页刷新／返回跳位与滚轮停顿修复 · 2026-10-26

## 复现与原因

基线应用为已发布的 `7fdee36`（本轮开始仓库 HEAD `6d76bbc`）。使用隔离正式构建 4217，在 Chrome 与 Playwright WebKit 中执行真实刷新、导航和后退。

1. `mountHomePosition` 在开场动效的 pin 尚未建立时立即记录可见章节。浏览器或路由此时已经恢复了旧滚动距离，但页面仍是未展开的临时布局；初始化 refresh 随后把临时章节恢复到屏幕中，产生错误位移。记录显示视频区刷新从约 4222px 被推至 6148px；产品区刷新误移 1636px。产品页深处点击首页也可停在约 3436px，而非首屏。
2. 全局 `mountReadingAnchors` 截断纵向滚轮输入，并在章节落点短暂吞掉后续惯性。视频区实测输入 160px，页面只移动 20px；产品区只移动约 6px。这是本轮确认的滚动停顿来源，不代表已排除所有设备上的性能瓶颈。

## 修复

- 不再捕获动效建立前的临时章节；在同步布局建立完毕后的首个动画帧再记录稳定位置。继续保留窗口缩放时的阅读位置维护。
- 移除全局纵向滚轮吸附和等待拦截，交给浏览器自然滚动。横向卡片手势及按钮、背景视差、开场影片、按需视频、明确的页内锚点继续保留。
- 点击导航首页回到首屏；刷新／浏览器后退仍按正常浏览器行为保留正确阅读位置，不强制跳到视频区。
- 应用改动 `HomeMotion.tsx`、`homePosition.ts`、`readingNavigation.ts`、`openingVideo.ts`。没有改动产品文案、背景设计、后台、数据库或支付逻辑。

## 验证

- 先添加真实浏览器回归用例。旧版 4 项：3 FAIL（两处刷新、产品页返回首页）／1 PASS（后退）。未改变预期来迁就旧实现。
- 首次修复定位后：双引擎 6 PASS／2 FAIL，失败均为产品区滚轮仍受拦截；另一个专门的视频区滚轮用例也失败，随后移除吸附逻辑。
- 最终 Chrome／WebKit 共 30 PASS，另有 Chrome 连续缩放专项 9 PASS；总计 **39 PASS／0 FAIL／0 SKIP**。
- 覆盖：连续三次刷新、不同深度产品页反复返回首页、后退、纵向滚轮、视频切换与旧视频暂停、离屏 WebGL 停止渲染、慢视频不阻塞导航、减少动态效果、手机 390px 到 1199／1200／1201／1440px 切换、2560×640 与 3840×960 的 16:4 比例，以及连续改变宽高后的开场进度和锚点定位。
- 28 个单元测试文件、**198 项测试全部通过**；隔离正式构建与 TypeScript 通过；修改文件 ESLint 通过。
- 构建保留原有 Next middleware 迁移提示、Next 内部 Edge API／大字符串缓存警告，未在此次修复中进行框架迁移。浏览器模拟不等于真实手机或系统 Safari 验收。

原始记录：`.lumiq-local/home-return-20261026/` 中 `reproduce.log`、`*-before.json`、`red.json`、`green.json`、`wheel-red.json`、`browser-final.json`、`resize-final.json`、`unit-final.log`、`build-final.log` 和失败 trace。

## 发布包

沿用 `huangshaotai737-1797s-projects/lumiq-showcase-20261025`，项目 ID 已通过 CLI 核验。724 个源文件；相对上一包仅四个应用文件及新增回归测试不同，源文件／已测试构建源／发布目录哈希一致。无环境变量、缓存、构建输出或 LFS 指针。包 SHA-256：`7614e9d6b02585a5d67293f8aa17abcd21ff2ff43afc120a756682466572ca3e`。

最终发布状态与线上复测见文末。

## 动态录像补充发现

第一轮已修复跳位和滚轮拦截，提交 `215d41a` 部署为 `dpl_EcNv73GMjzQWafSPTUEQPceUs8Ey`。回看实际动态录像发现，产品页 1800px 深度返回首页时，虽然滚动坐标已回到 0，第二段文字仍可与首屏重叠。补充真实可见性断言后，该路径明确失败，证据 `copy-red.json`。

原因是暂停文案时间轴的 `fromTo` 在路由从旧页面偏移量回到零帧时撤销起始样式，恢复了服务端的可见状态。改为先设置明确的隐藏起始态，再用 `to` 推进；响应式上下文退出时仍会正常恢复静态布局。

补充修复后，包含文案可见性、继续滚动后的重新出现，以及原有重复刷新／导航的双引擎套件再次 30 PASS；连续缩放专项再次 9 PASS，最终版本仍为 39 PASS／0 FAIL／0 SKIP（`resize-copy.json`）。198 项单元测试、正式构建和修改文件 ESLint 再次通过。最新原始日志为 `browser-copy.json`、`unit-copy.log`、`build-copy.log`、`lint-copy.log`。

实际操作录像验证：产品区刷新前后均为 3365px；滚动到视频区时背景视频时间从 4.8333s 推进到 10.2917s；产品页返回首页为 0px，开场视频 0s、下一段文字隐藏；页面脚本错误 0 条。最终录像和截图位于 `/Users/huangshaotai/Documents/outputs/01a13132-7aa0-7d01-8889-c18bbc65ccec/home-return-20261026-final/`。原始重叠截图仍保留于相邻的 `home-return-20261026/` 目录，未覆盖失败证据。

## 最终发布与线上复测

- 最终应用提交：`5ad7c4a81338da877d7cd4484182dab1f886949b`。
- Vercel 部署：`dpl_3HuuwkC6FizcRnZagMQJRQ7AhFNL`，`READY`，production。原地址 `https://lumiq-showcase-20261025.vercel.app/zh-hant` 已绑定。
- 线上 Chrome／WebKit 五条回归路径各一遍，首次 8 PASS／2 FAIL。WebKit 五条全部通过；Chrome 的两处连续刷新及深页导航、文案零帧状态通过。
- Chrome 失败两项（后退、纵向滚轮）均发生于最初 HTML 请求的 `ERR_CONNECTION_CLOSED`，尚未执行交互断言。独立重测后，后退通过；纵向滚轮再次连接中断，单独新进程重测仍中断。累计保留四次连接中断记录，没有删断言或更改应用。
- 最后一条纵向滚轮在仅关闭 QUIC 的 Chrome 对照环境中通过，页面滚动按原断言响应。此结果只证明该传输配置下功能通过，不能据此断言 QUIC 就是根因，也不能把默认连接的失败计为首次通过。默认 Chrome 到该域名的偶发连接稳定性仍需另行核实。
- 线上证据：`online.json`、`online-retest.json`、`online-wheel-retest.json`、`online-wheel-transport.json` 及对应日志／trace；最终部署结果 `deployment-result.json`。此次检查为公开展示站，不涉及后台数据写入或交易。
