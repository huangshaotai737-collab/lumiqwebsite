# Android Chrome 真机记录｜2026-11-11

测试地址：[LUMIQ 繁中首页](https://lumiq-parallax-collab-public.vercel.app/zh-hant)。本轮只测线上页面，没有修改网站代码。iPhone Safari 按用户最新要求暂停。

设备为 Xiaomi 15 Ultra（Android 16、Chrome 157.0.8103.48）。屏幕 1080 × 2400，网页视口 384 × 736 CSS 像素，设备像素比 2.8125。录像中可见 5G 与 VPN 状态。两轮均返回 HTTP 200。

| 轮次 | 缓存条件 | LCP | INP | CLS | 连续滑动估算漏刷新 | 最长帧间隔 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| [已有缓存](android-chrome-run-01/results.json) | 保留 Chrome 现有缓存 | 744 ms | 176 ms | 0 | 2 次／460 帧 | 33.4 ms |
| [清空缓存](android-chrome-cold-01/results.json) | 导航前清空浏览器缓存 | 1012 ms | 160 ms | 0 | 4 次／461 帧 | 66.7 ms |

每轮从首页加载后连续上滑 8 次，页面滚动位置由 0 到约 3586 CSS 像素。点击顶部 Logo 后回到 `scrollY=0`；菜单打开时 `aria-expanded=true`，关闭后为 `false`。两轮都完成了这些操作。

截图与录像：

- 已有缓存：[加载后](android-chrome-run-01/01-loaded.png) · [滑动后](android-chrome-run-01/02-after-scroll.png) · [回顶](android-chrome-run-01/03-return-top.png) · [菜单打开](android-chrome-run-01/04-menu-open.png)
- 清空缓存：[加载后](android-chrome-cold-01/01-loaded.png) · [滑动后](android-chrome-cold-01/02-after-scroll.png) · [回顶](android-chrome-cold-01/03-return-top.png) · [菜单打开](android-chrome-cold-01/04-menu-open.png) · [操作录像](android-chrome-cold-01/operations.mp4)

LCP、INP、CLS 由页面导航前注入的 `web-vitals` 采集；原始指标变化、导航计时、逐次滚动位置和每帧间隔保存在各轮 `results.json`。漏刷新数依据约 16.7 ms 的本轮帧间隔中位数估算，反映页面 `requestAnimationFrame` 采样，不等同于系统合成器的硬件掉帧计数。清空浏览器缓存不等于重启手机或断开已有网络连接。本记录是两次单机实测，不能当作真实访客的第 75 百分位。

Chrome 在录像里弹出了网页翻译提示和站点信息气泡；网页截图不包含这些浏览器界面。菜单展开时，背景大标题会淡淡透过面板，见菜单截图。两轮各记录到两次首页视频请求的 `net::ERR_ABORTED`；当前截图没有显示该视频加载失败，单凭取消请求不能判定为页面故障。
