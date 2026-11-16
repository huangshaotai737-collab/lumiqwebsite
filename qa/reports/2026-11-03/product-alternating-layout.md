# 产品页图文交替与 Ola 成人场景合并

基线：690e75e。范围：LumiqOla、LumiqOlaGo、LumiqTablet、LumiqPrint、LumiqOrb。按用户 2026-11-03 截图与明确要求调整。

## 改动

- 首屏后图文按左图右文、左文右图交替；900 CSS 像素及以下统一正文在前、图片在后。
- 五页同层级 H2/H3 使用共享字号、字重、行高；保留各语言字体。没有改变正文文案或业务规则。
- Ola 的“成人日常”和“长辈日常”合并为一个“成人日常”，保留两段说明及六项功能，仅移除第二个重复分组标题。新图为成人陪伴长辈的同一场景。
- Ola“五种安静力量”中重复的产品渲染图替换为原有成人居家场景图；“三个方向”的产品图保留。
- 新场景增加独立 CMS 素材槽。原始快照、字段 ID、111 个原始素材槽不变。两处历史使用位置在台账中明确记录替代图片及原因，检查器仍验证替代内容和精确绑定，未放宽一般素材缺失规则。

首页动效、全速图片加载、按需视频、蓝光文案、价格、支付和权限逻辑均未修改。

## 验证

| 项目 | 结果 |
| --- | --- |
| Next 生产构建及 TypeScript | 通过 |
| 修改文件 ESLint、git diff --check | 通过 |
| 官网单元测试 | 31 个文件、220 项通过 |
| 后台 TypeScript、独立构建边界/契约测试 | 通过；4 项边界测试通过 |
| 后台单元测试 | 19 个文件、141 项通过 |
| 国际化检查 | 3 种语言、994 个键通过 |
| CMS 快照、字段、素材绑定及契约同步 | 通过；4,396 个历史字段、111 个原始素材槽保留 |
| 三语言 × 五页内容比对 | 15 组通过；除明确合并的 Ola 分组外，没有遗失原文、图片或链接 |
| 六种尺寸下的区块布局 | 144 组区块、168 组图文行通过；无横向溢出、坏图或排列错误 |
| 同级标题样式 | 30 个页面/尺寸组合通过；五页字号、字重、行高及字体一致 |
| Orb 锚点、配色切换与 Tablet 技能、成长阶段、手机 FAQ 跳转 | 桌面与手机合计 16 组通过 |
| 浏览器错误 | 本轮未观察到 |

视口：1440×1000、390×844、2560×640（16:4）、901×900、900×900、320×800，均为 Chromium 模拟视口，不代表真机验收。

首轮发现 Tablet 手机端个别 H3 行高比其他页面多 1px，已统一后重新执行整套布局检查。首轮内容检查错误地把日文旧分组标题记为“いつもの存在”，实际为“親しみのある存在”；核对基线后更正允许合并的标题，正文断言没有放宽。首轮记录保留。

原始结果、基线、72 张区块截图及操作脚本位于本地 `.lumiq-local/product-alternating-20261103/`。代表区块已视觉检查。大于视口的区块截图中，固定背景只显示捕获时视口范围；该留白不作为页面实际滚动背景缺失的证据。

新增素材策略迁移 `20261103120000_ola_companion_media.sql` 随代码提供，未在远程数据库执行；公开展示站使用打包素材。CMS 解析、替换与私有预览 URL 已单元验证，尚未执行远程后台上传端到端测试。

## 场景图生成记录

执行模式：内置 image_gen 编辑。参考原有成人与长辈场景，生成单一共同场景；不是品牌方提供的真实拍摄照片。输出 `related/website/public/assets/ola-scenes-20261103/adult-senior-companion.webp`，1448×1086、259,488 字节，转换为 WebP 供网页使用。

提示词：

> Use case: compositing. Asset: photorealistic lifestyle illustration for Lumiq Ola product website, landscape 4:3. Edit target image 1 (older woman with gold Lumiq Ola device at a wooden table). Supporting reference image 2 supplies the middle-aged woman and the warm family mood. Create one cohesive, realistic scene of the middle-aged adult daughter spending time with her elderly mother, sitting together at the same table in a softly daylit neutral living room. Both adult daughter and older mother visible, natural warm interaction, daughter gently touching mother's shoulder while they talk and enjoy the companion device together. Keep the same elderly woman's identity, white hair and cream knit clothing from image 1; use the middle-aged woman's appearance and beige knit clothing from image 2. Crucial invariants: retain ONE recognizable gold Lumiq Ola device from image 1 on the table, preserving its vertical gold frame, clear central chamber with the same blonde anime character inside, top camera and round black clock at the base. Product must not be redesigned, duplicated, distorted or obscured. Wider composition to comfortably include both adult people, product entirely visible. Natural photographic skin texture, believable hands and furniture, subtle uncluttered warm cream interior, landscape 4:3 crop suitable for a product page. No children. No text, labels, borders, badges, watermarks or collage split. This is a single unified photo-style product lifestyle scene.
