# Orb 场景图黑边修正

2026-11-03。源码基线：`a1d50bfece0e863a3d2c243bfc9a0bbe1941e6f4`。

## 原因及改动

- 厚黑色内边已画在共用特写背景 `related/website/public/assets/nest-detail/generated/nest-routine-closeup-v2.png` 中，并非品牌提供的真实界面或网页 CSS 边框。
- 参考原有产品素材 `related/website/public/assets/web/nest15-oak-front.webp`，通过内置 image_gen 编辑将黑色内边改成浅色内边；保留木框、拍摄角度、场景与屏幕位置。原 URL 和 CMS 媒体字段 ID 不变，没有更新数据库、草稿或发布历史。
- 最终素材仍为 1448 × 1086 PNG；进行调色板编码压缩，由 1,577,308 字节减至 510,781 字节。SHA-256：`be5e25670d62a81e34932467bd2fbe9dd7ba6a436f841b93cb5659958ff756e0`。编辑工具、参考文件及完整提示词见 [图片编辑记录](orb-bezel-prompt.json)。
- 食谱、日历、奖励、相框、页尾及放大预览继续叠加品牌方真实界面，没有生成或替换界面文字。
- 复测还发现页尾旧图片规则施加了 150/230px 最小高度、16px 内边距和 multiply 混合，导致场景照片与界面投影错位。仅在 `.orb-scene-photo` 范围清除这些继承样式，保持照片与投影等尺寸。
- 产品首屏、文案、商品功能、会员、后台、配色按钮与页面布局均未重写。黑色外框仍是合法可选配色，本次修正的是浅木色场景里的错误黑色内边。

## 验证

- 官网生产构建及 TypeScript 编译通过；CMS 可视化渲染源一致性检查通过。
- Chromium 和 WebKit，各覆盖 1440 × 1000、390 × 844、2560 × 640。每个尺寸检查 6 个内联特写，四边像素检查通过，无页面横向溢出。
- 两个浏览器均检查全部 6 个放大入口：真实截图成功解码，浅色内边存在，Esc 关闭后焦点返回原按钮。
- 两个浏览器均检查橡木、胡桃木、黑色 3 种选择：按钮状态、场景设备及首屏产品图对应一致。未观察到页面脚本异常。
- 保留原 SVG 投影方案；既有厨房界面投影验证在 6 组浏览器/尺寸组合中均未检测到界面越出屏幕。
- 首轮脚本曾误定位厨房图的隐藏弹窗，修正为实际内联特写；第二轮发现页尾样式错位并保留失败截图，修正 CSS 后全部复测通过，未放宽边框颜色断言。
- [本机原始检查结果](orb-bezel-evidence/local-results.json)。截图包括电脑、手机和超宽屏；WebKit 属于浏览器引擎测试，不代表 iPhone 真机验收。

## 发布

已发布到现有 `lumiq-showcase-20261025` 官网项目，部署 `dpl_ELaaVdPSPDza4VBYAL1XJhKsCX3o` 状态为 READY。

- 公开入口：[Orb 页面](https://lumiq-showcase-20261025.vercel.app/zh-hant/products/nest)。稳定域名匿名访问为 HTTP 200，不需要 Vercel 登录。
- 线上 Chromium 验证 6 个内联特写、6 个放大入口和 3 种配色全部通过，没有页面脚本异常。见 [线上检查结果](orb-bezel-evidence/public-results.json) 和 [线上截图](orb-bezel-evidence/public-1440.png)。
- 公开素材下载后的 SHA-256 与本次修正文件一致，确认上线的不是旧黑边图片。
