> **后续状态已更新：**追加修复和最终复测见[追加报告](followup-report.md)。目前114/147项完成、24待材料、9待确认；手机实验室LCP中位1.696秒。下文保留首轮当时的113项、11个技术修复和4.756秒历史证据，不作为最新计数。

# LumiQ 官网与后台详细验收报告

日期：2026-10-25。范围：本机源码、独立测试镜像、一次性本地数据库和已发布的本地 CMS 内容。本文根据各专项的原始结果整理，不代替生产上线验收。配套逐项测试状态见 `test-matrix.csv`。

本文中的证据路径均相对于 `.lumiq-local/audit-20261025/`；源码路径相对于仓库根目录。原始日志、截图、视频和浏览器 trace 保留在私有审计目录；报告不复制账号、凭据、完整 trace 内容或个人数据。

## 1. 当前结论与交付边界

本轮已实际贯通访客浏览、候补报名、会员账号与恢复、订单幂等与取消、后台内容发布与回滚、素材权限、会员和候补运营、团队邀请与角色变更等流程。测试包含真实本地写入后的数据库查询、权限反例、失败恢复和持久化检查，不只检查页面出现成功提示。

已修复的应用问题包括团队保存中的可编辑状态、官网导航的语义与焦点、局部文字对比度、订单页一级标题、设计预览索引设置，以及首页画布离屏运行、超宽视频布局、缩放加载门控和直接进入 OLA 片段时的滚动冲突。首次失败与修复后证据均在下文分开列出。测试夹具、过期断言和定位器修正单独记录，不计为应用缺陷修复。

后台与业务浏览器合计 **80 个去重用例通过**，SQL 为 **18 个文件、550 条断言通过**；官网默认单元测试 **28 个文件、198 项通过**，后台 **18 个文件、138 项通过**，另有 **4 项后台边界与合约检查通过**；整合阶段还确认 **41项根目录脚本测试通过**。这些结果来自有据可查的独立执行批次，不能解读为同一轮全平台最终集成测试。

本地 CMS 已通过正常草稿、审核和发布流程发布 **28 个标量字段**：25 个受众文案字段与 3 个三语 Orb「15.6 英寸」恢复字段。发布 ID 为 `e3767acb-2380-4a25-8b61-47bdde41bdcd`。最终渲染证据覆盖三种语言、9 个页面 URL，28 个字段断言全部通过，见 `content/rendered-final.json`。这是本地发布结果，不是远端生产部署结果。

**最终本机版本已完成构建、激活与受影响回归。** 源码指纹 `cf2d18a31b0181a57c36cb834869b57d190e887648d9fd191e23ea5138a56a04`，Node22.23.3。两站首次从干净依赖安装构建通过；性能修复后官网再次构建，后台应用源码指纹一致，复用已验证产物。原账号、草稿、配置与数据库保留。最终20项加载／动效用例分别通过；手机限速LCP仍为4.56–4.76秒，是未关闭P2。建议继续本地设计与业务验收，尚不具备无条件正式交付依据。

## 2. 版本、环境与数据隔离

| 项目 | 实际情况 |
| --- | --- |
| 审计开始时 Git 基线 | `89db247fdf490e13f804618881239812585181f7`；工作区有后续未提交修改，基线不是最终交付指纹 |
| 推荐运行时与整合验证 | Node22.23.3；两站独立干净npm ci、198／138单元、4项边界、类型／lint／构建通过；根目录41项串行测试通过 |
| 已通过整合快照 | UTC 07:47:53–07:50:07，指纹 `eaf85fd8b4e42bbb9bb587c9aaf2140ffd67a251246b051581560c45a8a7ebd9`；后续性能源码变更不在该PASS内 |
| 本地生产模式激活 | UTC 07:51:40，原配置保留、databaseReset=false；5个官网URL及后台login均200，各查2个资源；证据 `integrated/activation.json` |
| 专项浏览器镜像 | 部分使用 Node 24.11.1 开发服务器；该事实保留，不冒充最终生产构建 |
| 官网框架 | Next.js 16.4.2、React 19.2.7 |
| 公开页面镜像 | 4293专项曾运行后停止；最终4211为生产模式新构建，4270为后台；都使用原本地54321数据 |
| 动效镜像 | `127.0.0.1:4290`；专项拥有的服务器已停止 |
| 一次性后台数据环境 | Supabase 项目 `lumiq-audit-20261025`，API 55321、DB 55322、Mailpit 55324、SMTP 55325；独立容器网络和数据卷 |
| 数据来源 | 仓库迁移、空初始数据及测试自建合成用户／业务记录；未复制真实客户数据 |
| 隔离规则 | 后台专项未 reset、seed 或修改原有 4211／4270／54321 配置和账号；延续阶段未为补报告重启或重置数据库 |
| 源码对应证据 | `admin/scoped-source-provenance.json`：8 个本专项后台／SQL 文件，经仅规范化明确的端口和项目替换后匹配执行镜像；`public-detail/public-source-mirror-hashes.json`：15 个公开页源码／测试文件匹配镜像 |

不同阶段分别绑定对应源码和运行方式，不能把早期镜像全部结果当成每次后续改动都全量重跑。最终公共及后台配置保持，API、RLS和迁移无应用改动；后续加载变更仅对官网相关路径复验。

## 3. 计数口径与结果总表

不同类型的数字不可相加为一个“测试总数”。页面请求、视口组合、字段断言、SQL 断言与浏览器用例分别统计。重复聚焦重跑、子集重跑不再次累计。

测试矩阵包含 **74组当前验收条目**，另保留1组历史失败记录。当前状态为：63组PASS、1组FAIL、3组BLOCKED、2组NOT_RUN、4组NEEDS_REVIEW、1组N/A。条目组存在覆盖重叠，不能视为74个互不重叠的自动化用例。原品牌要求核对组的PASS只表示核对工作完成；各要求是否达成仍以147行状态为准。不同套件的首次失败、配置跳过和重跑记录见第6节，没有合并成一个“首次全通过率”。

| 检查类型 | 实际数量与结果 | 口径及主要证据 |
| --- | --- | --- |
| 官网默认单元测试 | 198 项／28 文件 PASS | Node 22、普通默认命令、无超时覆盖；`public-detail/unit-standard-final.log` |
| 后台单元测试 | 138 项／18 文件 PASS | Node 22 当前源码复核；`admin/unit-continuation-node22.log` |
| 后台边界与合约 | 4 项 PASS | 独立构建边界、样式／源码依赖边界、合约生成一致性与缺失／陈旧副本修复检查；同上 |
| 数据库测试 | 550 条断言／18 文件 PASS | 初次执行只到 515 条且 3 个文件失败；修正过期夹具后完整通过；`admin/sql-tests-final.log` |
| 后台及业务浏览器 | 80 个去重 test/project 用例 PASS | 后台／自定义 44，官网业务 36；跨批次归并；`admin/completed-journeys.json`、`admin/run-history.jsonl` |
| 后台路由响应式 | 10 模块 × 5 宽度 = 50 组合 PASS | 320／390／820／1440／1920，检查路由、标题、溢出和脚本错误；包含在自定义浏览器范围，不增加 50 个浏览器用例 |
| 公开页面精选流程 | 8 个独立流程已分别通过 | 初轮 7 过 1 失败，FAQ 未改代码聚焦重跑通过；购物车另独立复核。不是一次连续 8/8；`public-detail/REPORT.md` |
| 精选跨浏览器范围 | 12 个浏览器用例 + 3 个请求型元数据检查 | 每种引擎 4 个浏览器用例；8 项初次因 Firefox／WebKit 未安装而无法启动，安装后各 4 项通过。不是首次 15/15 |
| 动效最终串行回归 | 16/16 PASS | 系统 Chrome 155.0.8059.86、单 worker；此前 Chromium 7/7 是子集，不额外累计；`motion/final-regression-results.json` |
| 公开页面路由 | 87 个本地化直接请求 + 8 个特殊路径检查 | 87 中 75 个 200、6 个 308、3 个预览 307、3 个预期 404；预期跳转和拒绝不是失败 |
| SEO | 51 个公开页面 canonical／3 语言 alternates；sitemap 39 URL | 13 页面族 × 3 语言；实际域名归属和上线配置仍待生产确认 |
| 链接和本地资源 | 145 个引用检查通过；146 个 CSS 图片／字体 HEAD 200 | 未观察到引用资源 4xx／5xx 或锚点缺失；未引用的 favicon.ico 404 不作缺陷，配置的 icon.svg 为 200 |
| 公开页初始布局 | 69 个页面 × 9 视口 = 621 组合 | 不含首页／演示页；匿名订单／账号状态；无捕获的横向溢出、导航与 H1 重叠、脚本异常或已完成加载图片失败 |
| 受影响页修复后布局 | 12 个页面 × 9 视口 = 108 组合 | 首轮 11 页完成、英文 Orb 一次导航中止；聚焦补齐后合并，见 `public-detail/browser-after-complete.json` |
| 自动无障碍扫描 | 初始 138 次；修复后 24 次零 violations | 修复后仍有 48 条 incomplete 项，图片背景对比度等需要人工复核；不是完整 WCAG 认证 |
| 三语键检查 | 994 个键、3 种语言 PASS | 官网专项记录；不代表每项翻译均经品牌语义审校 |
| 动态采样 | 15 次产品选择、9 次视频播放 PASS | 5 产品 × 3 视口、3 视频 × 3 视口；不是额外浏览器用例数量 |
| 最终源码受影响回归 | 20个去重用例分别PASS | 4项新资源优先级＋7项动效资源＋9项开场缩放；初批11过9配置跳过，正确desktop项目补跑9/9；两批均0 unexpected/flaky |
| 无语言前缀别名 | 16/16 跟随跳转后200 | `integrated/unprefixed-routes.json`；只做HTTP，不重复计算浏览器流程 |
| 最终 CMS 页面断言 | 28/28 字段 PASS，9 页面 URL、3 语言 | `content/rendered-final.json`；只证明相应本地发布内容渲染 |
| 整合阶段干净安装／构建 | 两站npm ci与两站原生build均PASS | Node22.23.3；`integrated/install.json`、`verification.json`，绑定上述快照，不覆盖后续性能修改 |
| 根目录脚本测试 | 41/41 PASS，串行 | `integrated/root-tests-serial.log`；独立于198／138／4的计数 |
| 本地激活 | 6个页面200，各2个资源检查 | `integrated/activation.json`；保留配置与现有数据库，非云端部署 |
| 生产模式选定回归 | 24个去重test case已分别通过 | 23项实际浏览器＋1项请求型metadata；首轮23过1失败，测试修正后聚焦1过；`integrated/production-results.json`、`production-controls-rerun-results.json` |
| 性能修改后的最终构建／激活 | PASS | `integrated/final-verification.json`、`final-activation.json`；指纹 `cf2d18a31b0181a57c36cb834869b57d190e887648d9fd191e23ea5138a56a04`，官网198单元／类型／lint／三语／生产构建通过；后台源码不变、产物复用 |

公开页 9 个布局视口为宽度 320、390、430、768、1024、1440、1920，加 2560×640 与 3840×960。不同专项使用不同视口，不宣称每个功能都已在所有宽度检查。

### 整合生产模式复验的精确范围

`integrated/production-results.json` 的24项包含：品牌布局5、品牌交互4、动效资源7、产品卡布局3、无障碍2、表单验证2、请求型元数据1。单worker、retries=0，首轮23项通过，桌面产品控件位置测试1项失败。失败是测试先选HTML／WebGL渲染器、再分次取boundingBox，恰逢交接使旧节点无矩形；原错误为读取null的y。修正测试在同一浏览器任务中读取渲染器和两矩形、等待几何稳定，没有修改应用或放宽位置判据。聚焦该项通过，因此24个去重test case均有通过证据，不能称初轮24/24。

`integrated/production-controls-test-amendment.json` 记录了修改前后测试哈希、仅同步测试文件、applicationFilesChanged为空，以及原失败trace保留。第一次聚焦筛选未找到测试，0项设置失败也保存在 `production-controls-filter-setup-results.json`，未计入通过。随后聚焦重跑1项通过。这里的表单用例拦截网络请求，检查无效输入与网络错误恢复，不会把激活后的真实用户环境写入合成业务记录。

该24项与早先动效／公开页专项有重叠，不与80个后台／业务用例、16项动效或公开页精选用例直接相加为全局去重总数。

## 4. 核心业务流程及真实结果

### 4.1 访客与会员

- **候补报名：** 390px 手机表单实际 POST 返回 201／created；直接查询一次性数据库得到恰好一条匹配记录。大写重复邮箱返回 200／already_registered，畸形输入返回 400，异源返回 403。测试 finally 删除自建记录。证明的是执行时的本地真实保存，不能用已清理后的当前状态或生产环境代替。证据：`admin/e2e-audit.log`。
- **账号与找回：** 18 个用例，桌面与手机模拟各 9 个。使用本地 Mailpit 的真实确认／恢复邮件，检查 PKCE verifier 绑定、邮箱确认、退出、过期会话、回跳与本人资料隔离。浏览器保存姓名后直接读取 `profiles.display_name` 核对；测试后清理合成账号。证据：`admin/website-account.log`。
- **购物车与订单：** 10 个用例覆盖关闭入口、安全登录、重复提交、丢失成功响应、恢复、账号切换、取消及条款变更。故意丢失 201 响应后数据库仍只有一单；刷新重试复用幂等键后仍只有一单，金额与订单快照匹配。取消在刷新与重复请求后持续生效。旧条款 409 不增订单；明确重新同意后 201，存储的 `terms_release_id` 与新版本相符。其他会员猜测订单 ID 被拒绝。证据：`admin/website-orders.log`。
- **支付关闭策略：** 受测会员的订单初态为 `not_configured`，结账返回 503／PAYMENTS_NOT_CONFIGURED；匿名 401、未确认用户 403、错归属 404、异源 403、伪造金额等 400。伪造成功 URL／通知／webhook 不能修改订单，数据库 payment attempts／events／refunds 均为 0；共享限流达到 429。该用例通过意味着关闭策略有效，不意味着能真实付款。证据：`admin/website-payments.log`。

公开浏览流程还检查三语导航、产品入口、FAQ、购物车持续性及选定键盘路径。FAQ 的批准清单为 17 题；商品价格依据 BR-043 的 359×2=718，未用旧测试的 798 修改产品价格。

### 4.2 内容编辑、素材与发布

- **内容编辑 7 个用例：** 非法输入保留、字段定位、保存／提交中的值锁定、409 并发冲突及冲突下载、编辑角色不能修改设置或越权运营草稿、非法 ICU／语言拒绝、正常发布与历史回滚。过期定位器修正后完整通过。证据：`admin/e2e-content.log`。
- **可视编辑临时态：** iframe 点选、临时输入预览、撤销、语言／设备切换通过；比对草稿版本与快照，确认这些临时操作没有写入持久草稿。证据：`admin/history/audit-1792911396856-previous.log`、`admin/evidence/visual-editor-undo.png`。
- **素材 5 个用例：** 实际上传；匿名不能取得原始私有素材；HTML 伪装、超限、外来对象被拒绝；失败发布保持私有；发布版本不可变；归档与历史回滚、视频／海报成对关系，以及 200 次尝试后较老素材仍可处理。证据：`admin/e2e-media.log`。
- **发布 7 个用例：** 实际后台保存／发布使三语公开页面更新；模拟后端失败、非法或空内容时继续展示最后有效版本；匿名、伪造、撤销与运营身份不能读取未发布文字或私有素材。页头／页尾导航退出预览，公开版本切换后文字、Logo、图片和购物车更新；清理通过正常发布恢复合成初始版本。证据：`admin/history/website-publishing-1792911850897-previous.log`。较新的 `admin/website-publishing.log` 只含其中 1 项聚焦重跑，未重复计数。
- **最终品牌内容发布：** 28 个标量字段属于后来正常 CMS 发布的独立证据，不能与上述合成发布用例混为一次执行。25 个受众字段及 3 个 Orb 尺寸字段在三语实际 DOM 均通过，发布 ID 和证据见第 1 节。

### 4.3 运营、管理员与权限

- **会员／候补运营：** 真实报名和大小写去重；管理员、运营允许，编辑和普通会员拒绝；筛选、分页、详情和备注持久化；版本过期返回 409。实际下载 CSV 字节包含 UTF-8 处理、公式前缀保护，配额与审计原子提交。网络刷新失败保留已显示行；保存失败保留输入。证据：`admin/e2e-operations.log`。
- **团队：** 4 个用例包含真实 Mailpit 邀请，只有已确认且邮箱一致的接收人显式接受后才授权；错误身份 403、重复接受 409；SMTP 失败不授予角色；角色和 Origin 拒绝在服务端执行。当前有效成员关系逐次查询，不能靠旧 JWT metadata 持续授权。团队保存问题另见第 5 节。证据：`admin/e2e-team.log`。
- **后台认证：** 8 个用例覆盖匿名／非员工拒绝、metadata 不能授予成员关系、停用与撤销即时生效、SSR 会话刷新与 Cookie 清除、过期 refresh 拒绝、Origin 和共享限流。预期的 invalid-refresh 日志是负面测试输入。证据：`admin/e2e-auth.log`。
- **商品、订单运营和隐私：** 各 1 个综合旅程。商品版本与 Origin 校验，非授权角色拒绝；订单列表／筛选／详情／备注与审计，停用后同一 JWT 失权；隐私策略未开时拒绝，实际 Auth 失败可恢复，合成私有数据按范围删除。证据：`admin/e2e-catalog.log`、`admin/e2e-orders.log`、`admin/e2e-privacy.log`。
- **后台布局：** 十模块在五宽度分别 HTTP 200、标题可见、文档宽度不超过视口 1px，无捕获 page error。专项作者记录抽查了 catalog 320、order detail 390、content workspace 390、visual editor 1280 的实际截图。路由直接打开通过，不等同每个侧栏入口都逐一重新点击。证据：`admin/evidence/module-matrix.json` 和其 20 张截图。

SQL 还独立覆盖 RLS、最后管理员保护与并发、不可变发布与审计、媒体历史、运营分页／导出、订单快照与限额、隐私租约、支付合约和迁移保留。550 是断言数，不是 550 个页面流程。

后台该次完整与生产依赖 npm audit 均报告 0 项，证据为 `admin/npm-audit.json` 与专项日志；这是当次依赖数据库返回的结果，不能扩大为全部项目或业务逻辑零风险。本专项没有为消除历史提示而进行依赖升级。

## 5. 已确认应用缺陷与修复

下表的 P2／P3 为已明确的专项分级；动效四项的 P2 为按 `qa/scope.md` 局部交互／资源行为标准归类。上述专项已确认的应用缺陷中没有新增 P0／P1 项；这一列表不代表未执行范围不存在此类风险。

| ID／级别 | 首次观察与影响 | 修改及复验 | 证据 |
| --- | --- | --- | --- |
| ADMIN-TEAM-01／P2 | 后端真实保存响应被挂起时，角色与在职控件仍可改；成功后再次改值还显示“已保存” | `TeamTable.tsx` 锁定 pending 控件、编辑即清除反馈；同一 held-response 用例验证 DB 值及后续编辑状态通过 | `admin/e2e-team-red.log` → `admin/e2e-team.log`；首轮文字日志保留，原瞬态 trace 被执行器替换，不能声称原 trace 仍在 |
| PUB-SEO-001／P2 | 三语设计演示 glass-preview 可被索引 | 增加 noindex／nofollow；页面仍可访问且不进入 sitemap | `public-detail/metadata-red.log` → `metadata-green-rerun.log` |
| PUB-A11Y-001／P2 | 语言选择未命名／无效 listbox，选中项对比度 2.52:1 | 有标签的原生列表和按钮、当前态、加深文字；保留背景 | `public-detail/accessibility-red.log`、`interactions-first.json` → `accessibility-green-final.log`、`interactions-after.json` |
| PUB-A11Y-002／P2 | 手机导航 menu 子项语义无效，关闭后焦点留在隐藏按钮 | 原生导航链接；关闭返回触发器焦点 | 同上 |
| PUB-A11Y-003／P2 | 桌面 FAQ 数量文字对比度 4.49:1 | 使用已有较深文字 token；没有新增背景遮罩 | `public-detail/browser-first.json` → `accessibility-green-final.log` |
| PUB-A11Y-004／P3 | Orb 章节编号对比度 4.05:1 | 使用已有 muted 文字 token，保留背景 | 同上 |
| PUB-A11Y-005／P2 | 订单列表及详情初始／错误状态没有一级标题 | 始终渲染本地化 H1；订单标识保持 H2 | `public-detail/order-headings-red.log` → `order-headings-green.log`（2 项） |
| MOTION-01／P2 | 画布未进入屏幕即 GPU 绘制，初始红例 500ms 内 96 次 draw call | 区分模块预加载与画布实际可见范围；可见才挂载 GPU，离屏／页面隐藏暂停，保留无 WebGL 导航 | `motion/red-test-results.json` → `final-regression-results.json` |
| MOTION-02／P2 | 2560×640 中央影片下缘到 677px，超过视口 | 根据可用高度约束影片 stage；保留原背景、人物、卡片与控件；两种 16:4 尺寸回归通过 | 同上；`motion/verified-films-2560.png`、`verified-films-3840.png` |
| MOTION-03／P2 | 播片时 1199→1200 缩放重建解码器，所有章节 inert，离屏跳过导致控件等到 12 秒兜底 | 只有开场可见时门控，离开即释放，保留媒体错误兜底；最终真实进入／坐标点击断言通过 | `motion/red-opening-gate-results.json` → `final-regression-results.json` |
| MOTION-04／P2 | 直接进入 #ola，开场恢复约 y2098 后 homePosition 旧快照又推到 y3528，影片离屏 | 明确开场锚点由开场控制器持有，直到真实输入／导航；直接 OLA 与其余开场回归通过 | `motion/opening-head-baseline-results.json`、`ola-probe.json` → `final-regression-results.json` |

动效源码修改范围为 `HomeGlassProducts.tsx`、`homePosition.ts`、`openingVideo.ts`、`home-films.css` 与相应测试。探索过的 20% 挂载阈值和自定义 restoring 事件未保留为最终方案。最终 16 项使用真实 wheel／锚点进入、坐标点击和实际计数变化，未通过定位器自动滚动掩盖缩放问题。

已另外修复BR-027中漏失的三语15.6英寸概念说明，以及25个受众文案残留字段。首屏加载竞争做了最小改进，但PERF-LCP-01仍未达标，不计入上述11项已关闭技术缺陷。

## 6. 首次失败、测试修正与环境限制记录

| 项目 | 首次结果 | 处理后结果及归类 |
| --- | --- | --- |
| SQL 初始夹具／限额并发预期 | 18 文件到达 515 断言；3 文件失败 | audit-boundaries／final-fix 原假设已有发布数据，与空 seed 冲突；补事务内自有 fixture 并回滚。order-concurrency 更新为同客户限额串行、不同客户并行。18 文件／550 PASS，未改迁移。保留 `admin/sql-tests.log`、`sql-tests-fixed.log`、`sql-tests-final.log` |
| TEST-CMS-01 | 脏状态宽泛正则同时命中 badge 和版本段落，5 个后续串行用例初轮未运行 | 精确定位 badge；原应用 pending／DB 断言已通过；完整 7 项重跑 PASS。归类过期定位器，保留 history 中初始 trace |
| TEST-OPS-01 | 旧测试 GET 导出预期 403，当前 POST 路由实际 405 | 修正 POST＋Origin 并新增 GET405／异源403／实际 CSV 字节断言；期间重复局部变量造成一次编译失败，已修复；最终旅程、tsc、lint PASS。保留原日志与 trace |
| HARNESS-FINAL | 最终加载／动效配置遗漏desktop项目名，开场9项按原guard跳过 | 保留11过9跳过原报告；使用desktop项目单独执行9项全部通过，未改应用或删除skip guard。两个批次合计20个去重相关用例通过；不是首轮20/20 |
| HARNESS-01 | 自定义启动端口 4281 被占；早期 SMTP 54325 冲突 | 未触碰既有监听，改用隔离 4287／4288 及 SMTP55325；属于执行环境阻塞 |
| HARNESS-02 | 新候补测试旧按钮名导致未提交；下一轮已成功 201，但 status 同时匹配购物车 | 采用当前按钮名并将状态定位限定候补区域；最后 1 项 PASS。没有增加超时，初始失败保留；不是报名存储缺陷 |
| 官网单元测试镜像 | 194 过、2 缺祖先 fixture；补 fixture 后默认执行 195 过、1 个导出测试 5 秒超时 | 曾显式 30 秒得到 196 通过，该次不冒充默认通过；最终 Node22 普通默认命令 198／28 PASS，保留所有阶段日志 |
| 元数据检查 | 原红例确实发现索引问题；修复后首轮冷编译 30 秒超时 | 热启动复验通过。分别记录真实应用红例与环境超时，未称超时本身为产品修复 |
| FAQ／购物车旧预期 | FAQ 旧 6 题、购物车旧总价 798 与批准原要求不一致 | BR-149 为 6 替换＋11 新增，共17；BR-043 为359×2=718。修测试，未按错误测试改产品。精选初轮 FAQ 后续还出现一次并发等待失败，未改应用聚焦三语重跑通过；保留失败 |
| 公开布局补跑 | 修复后首轮 11 页完成，英文 Orb 导航中止 | 单页定向补齐并合并 12 页结果，不宣称最初整轮无失败 |
| Firefox／WebKit | 8 项浏览器启动失败，缺少对应二进制 | 安装后 Firefox 4/4、WebKit 4/4；请求型元数据与 Chromium 原有结果分别保留 |
| 整合生产模式控件测试 | 首轮23过1失败，boundingBox交接期间返回null；首次聚焦筛选又发生No tests found | 仅修测试的同任务读取和稳定等待，原位置断言不放宽，后续聚焦1项PASS。原失败／0项设置失败分别保留，归类harness时序问题；24个去重case已分别通过，非初轮全绿 |
| 动效探索与采集 | 多轮真实缩放／锚点问题；一次采集脚本因修定位器主动中断 | 红例与基线失败保留；最终16/16。`interrupted-capture-harness.json` 是主动中断脚本，不计应用失败或完成；早期自动滚动探针仅诊断 |

后台浏览器使用单 Chromium worker、retries=0，按套件串行。日志汇总使用完整 `run-history.jsonl` 与 `completed-journeys.json`，不使用会被后一次覆盖的 suite-results 文件推断全量结果。

## 7. 动态体验、布局与性能证据

三个视口各实际切换五个产品、播放三个影片；产品链接、标题／入口顺序与中线、影片循环、旧影片暂停、减弱动效及无页面异常均通过。采样在实际读取 style 时使用 `performance.now()`，要求 800ms 内至少三个不同位置、2000ms 观察窗口内结束，未用预定 RAF 时间替代延迟观察值。

| 视口 | 产品／影片 | 首次实际过渡样本 | 800ms 内最少样本 | 最大观察间隙 |
| --- | --- | --- | --- | --- |
| 1440×900 | 5/5、3/3 | 21.6–25.3ms | 18 | 98.0ms |
| 2560×640 | 5/5、3/3 | 9.1–12.4ms | 31 | 51.9ms |
| 3840×960 | 5/5、3/3 | 47.2–52.8ms | 10 | 185.3ms |

证据为 `motion/verified-dynamic.json`、`motion/dynamic-summary.md` 及 `motion/verified-videos/` 中记录的对应视频。采集环境是 Chromium 151.0.7922.34、headless、SwiftShader 软件 WebGL、Node24 开发镜像。这些是功能及合成时序结果，不能换算成真实 GPU FPS、真实用户 INP／LCP／CLS 或线上 p75。

**2560×640 产品章节需要纵向滚动到图下方控件。** 后续产品截图反映真实滚动，有卡片位于视口上方；不应作为“全部构图同屏通过”。`verified-product-2560-1.png` 是独立初始五卡视图；3840×960 初始图含完整舞台和控件。两种超宽影片截图均包含完整中央影片与两侧控件。人物可能处于原入场阶段，实际连续过程以视频为准。

初测 `integrated/performance.json`：Chrome155、390×844、冷浏览器缓存、CPU×4、80ms延迟／1.6Mbps下行／768Kbps上行，LCP为5184／5188／5176ms。定位到首屏图初始Low优先级、屏外409KB人物图提前竞争；将首屏图显式High、人物兜底延后到影片章节临近加载，保留原图及动画失败回退。最终完整CMS环境 `integrated/performance-final.json`：LCP **4756／4556／4756ms**，中位较初测改善 **8.3%**，但仍高于2.5秒参考目标，保留 **FAIL／P2**。最终桌面1440×900本地未限速LCP为336／280／272ms，六次CLS均0。独立无相同CMS的诊断stage曾为3984／3972／3996ms（约23%改善），不选取该较好数据替代最终结果。剩余低速并发包括中文字形、CSS和章节图片；后续优化须保留背景、无JS内容、快速滚动与字体布局。没有Lighthouse评分或真实用户p75／INP声明。

无障碍 24 次修复后扫描零 violations 仍保留 48 条 incomplete；全图背景下的文字对比度不能仅凭自动扫描关闭。既有背景与媒体保留，未为通过扫描添加用户已撤回的阅读遮罩。

## 8. 原始 147 条品牌要求的处理口径

原始分母固定为 **147 条**，来自原 Excel 第 2–149 行，排除空白第115行。行号对应 `BR-002` 至 `BR-149` 的有内容行。新发现的技术问题、浏览器私有数据、测试夹具或本轮新增检查不加入这147条，也不混入完成率。

原始147项已合并到 `brand-status.csv`：**113项在注明范围内完成（76.9%），24项待材料或外部验收（16.3%），10项待设计／范围／进一步验证（6.8%）**。历史118项完成、29项待办；本轮补齐5项发布，同时将10项证据不足或范围不明的历史完成项移回待确认，得到113项，并未新增原品牌要求。文字／结构核对、实际视觉／交互和实物／生产验收的证明范围均逐行注明。

- **已合并发布证据：** BR-053、BR-060、BR-072、BR-082、BR-132 的受众／用词已由正常本地发布与28字段DOM复核关闭；不把成人图片或正式上线一并认定完成。
- **BR-027：** 三语 Orb 15.6英寸已通过本轮正常 CMS 发布恢复，纳入28字段实际 DOM证据。
- **BR-092：** 后续用户要求为整张卡片的图片、名称、说明、入口沿中线；不能继续使用旧“探索靠右下”的完成说明。
- **BR-054／081：** 成人／长辈主视觉仍缺，受众文案更新不能替代图片。BR-071 新主视觉、BR-114 Orb 四组真实 UI、BR-120 普通平板对照图也需对应材料。
- **BR-034／058：** TUV／数值没有证书核验。BR-057 照片和声音数据规则、BR-059／124 功能状态，以及 BR-020／078／086 设备协作口径仍不能仅凭展示文字关闭。
- **BR-075：** 原要求限于试用后收费的时点与方式；不擅自扩成税费、退款等未要求的范围。
- **BR-080／087／088：** 阅读底色／遮罩方案已经用户撤回，原背景已恢复；设计待定不能继续写为旧方案完成。BR-089／097 的高清连续背景仍需源材料。
- **BR-011／067／094：** 实机类验收不得由浏览器模拟代替。BR-051 的整体叙事、其他未具备证据条目维持实际待办或 NEEDS_REVIEW。
- **英文原稿与翻译：** BR-101 的 CARE BY DESIGN、BR-139 的 Go Ola, Go Ola, Go! 与原英文一致；不能把 Feishu 后续中文翻译的展开方式当作英文逐字新增要求。自然繁中与简中译法差异也不能自动列为缺陷。BR-119／121 批准的展示术语大小写同理。
- **历史说明校正：** `docs/brand-display-terms.md` 已把旧“受众待定位”说明改为已确认的儿童／家长及成人／长辈口径，未把设备能力一并认定为完成；原 BR-016 Media & Review 的旧页面身份／位置不明时应保留 NEEDS_REVIEW，不能无证据声明漏做或通过。

24项待材料或外部验收：11、20、34、51、54、57、58、59、67、71、75、77、78、80、81、86、87、88、89、94、97、114、120、124。10项待确认：16、39、45、49、68、69、79、90、98、100。具体材料与设计问题在《代办》和brand-status.csv逐条列明；尤其90原图指向顶部导航，98原图指向旧产品目录，100是已撤下的顶部承诺条，不能借其他区域通过来关闭。

## 9. 仍未关闭的诊断及未验收范围

| ID／级别或类别 | 状态 | 事实及下一项判据 |
| --- | --- | --- |
| DB-LINT-01／P3 | NEEDS_REVIEW | 本地 lint 0错误、6警告，位于 `private.validate_order_request` 与 `private.commercial_terms_payload`，涉及 text 字面初始化 uuid[]／jsonb、IMMUTABLE 调 STABLE jsonb 构造。未展示功能失败，未为消除提示擅自新增迁移。证据 `admin/db-lint.log` |
| RUNTIME-STREAM-01／P3 | NEEDS_REVIEW | 拒绝预览时服务端出现 `TypeError: controller[kState].transformAlgorithm is not a function`；9个角色／语言拒绝路径均404、无未发布内容、无捕获浏览器异常，后续公开页200。不能写“服务器零错误” |
| 流诊断的既有依据 | NEEDS_REVIEW | `docs/admin/security-status.md`、`docs/admin/decisions.md` 记录Node22同类诊断与原生 TransformStream 取消／迟写最小复现、Node issue62036／PR62040。取消机制为有证据推断，尚非具体 Next 请求路径的完整跟踪；切Node22不代表已修复 |
| 自动无障碍未决项 | NEEDS_REVIEW | 修复后48条incomplete；图片背景对比度需要人工结合实际背景判读，不能等同48项确认缺陷或全站符合WCAG |
| 整合阶段构建与激活 | PASS（已记录快照） | `integrated/install.json`、`verification.json`、`activation.json`证实两站Node22干净安装／构建及无reset激活；绑定eaf85fd8…快照 |
| 性能修改后的最终构建／激活 | PASS | `integrated/final-verification.json`、`final-activation.json`；指纹 `cf2d18a31b0181a57c36cb834869b57d190e887648d9fd191e23ea5138a56a04`，官网198单元／类型／lint／三语／生产构建通过；后台源码不变、产物复用 |
| PERF-LCP-01／P2 | FAIL（已部分改善） | 最终完整本机环境4756／4556／4756ms，中位4.756秒，较初测改善8.3%，未达到2.5秒参考；4项资源优先级与失败回退回归通过不等于LCP达标 |
| 真实设备 | NOT_RUN | 真正iPhone Safari、Android、Windows字体与硬件GPU没有执行；桌面移动视口与WebKit引擎不能代替实机 |
| 生产SMTP | BLOCKED | 只在本地Mailpit检查邮件内容／链接和失败场景；没有正式邮件外部收件箱送达验收 |
| 生产数据库／迁移／备份恢复 | BLOCKED | 未操作远端；没有生产原始迁移清单、备份与恢复演练证明；本地550断言不能替代 |
| 真实支付／退款／订阅 | N/A（当前关闭产品范围） | 未配置／未启用提供商，只验收关闭策略。若改为上线支付，则须另列BLOCKED并进行正式集成验收 |
| 完整旧浏览器测试集合 | NOT_RUN | 未跑遗留全部集合；旧演示会员设备、旧媒体200期待等与当前产品不符，不用精选通过冒充全量 |
| 上线域名、部署、远端内容 | NEEDS_REVIEW | 本地canonical结构和CMS发布已验证；真实域名归属、生产部署与远端内容需要对应环境证据 |

### 本轮源码差异的独立只读复核

复核了当前工作区相对基线的应用源码差异、共用品牌补丁及两站生成副本、SQL测试修正和新增／修改的回归测试。后台应用改动仅为团队控件pending与反馈；没有改动服务端鉴权、API权限、RLS或数据库迁移。订单改动仅为标题结构与本地化文案，未把未经验证的订单ID移出成功数据分支。品牌补丁仍只在标量精确匹配before时替换；自定义CMS值发生冲突会保留，发布不是读取时覆盖。两站生成副本相同，与根合约只差生成文件头。

首页改动检查了画布可见性、页面隐藏／卸载清理、无WebGL回退、开场inert释放、锚点归属、影片失败静态图，以及新增fetchPriority在公开和可视编辑渲染器中的同步。当前差异未发现可确认的新权限扩大、跨用户泄露或持久化回归。此结论限于已读差异，不能代替完整安全审计；最终性能源码另有生产构建与20项受影响加载／动效复验，LCP未达标状态仍保留。

## 10. 已执行命令的复现入口

以下是执行证据的复现入口，不表示本报告生成阶段重新运行。含数据库写入的套件必须使用本次一次性隔离项目及其合成凭据配置；不得直接对现有54321运行 reset、seed 或 fixture。凭据、环境文件和完整操作数据未写入报告。

```sh
# 仓库根目录，使用 Node22；属于静态／单元入口
npm --prefix related/website test
npm --prefix related/website run typecheck
npm --prefix related/website run lint
npm --prefix related/website run check:i18n
npm --prefix related/admin test
npm --prefix related/admin run typecheck
npm --prefix related/admin run lint
```

SQL 使用隔离 `admin/isolated` 中的已替换项目配置执行 `supabase test db`，具体环境与阶段命令以 `admin/run-history.jsonl` 和原始日志为准。并非本文授权重建真实本机数据。

公开页命令在 `public-detail/` 下、已具备镜像与对应端口服务器时执行。以下全流程 selector 是从保留配置还原的等价选择器，原始完整 shell 文本未保留，不能宣称逐字原命令：

```sh
node site/node_modules/playwright/cli.js test -c flows.config.ts --grep-invert 'longest allowed member name|waitlist validation and a network failure|long Japanese hero actions|disabled browser storage|family picture swipes'
node site/node_modules/playwright/cli.js test -c flows.config.ts --grep 'FAQ search'
node site/node_modules/playwright/cli.js test -c flows.config.ts --grep 'cart contents persist'
node site/node_modules/playwright/cli.js test -c cross-browser.config.ts --project=firefox --grep-invert 'design preview routes'
node site/node_modules/playwright/cli.js test -c cross-browser.config.ts --project=webkit --grep-invert 'design preview routes'
AUDIT_BASE=http://127.0.0.1:4293 AUDIT_RUN=after-nest-rerun AUDIT_FILTER=/en/products/nest node browser-audit.mjs
```

最后一条保留实际内部历史路由 `nest`，展示名为 Orb。动效最终执行入口在 `motion/`，使用单 worker 和系统 Chrome：

```sh
node site/node_modules/playwright/cli.js test -c final-check.config.mjs
```

上述独立镜像服务器不由本文启动；复现前需依各专项配置确认依赖、端口和本地授权环境。

## 11. 证据索引与交付入口

| 主题 | 主要文件 |
| --- | --- |
| 后台／数据库完整说明 | `admin/report.md`、`admin/completed-journeys.json`、`admin/run-history.jsonl` |
| 后台最终Node22静态复核 | `admin/static-continuation-node22.json`、对应unit/typecheck/lint日志 |
| 公开页范围与失败历史 | `public-detail/REPORT.md`、`verification-summary.json`、`confirmed-findings.csv`、`bounded-check-commands.json` |
| 公开页布局与无障碍 | `public-detail/browser-first.json`、`browser-after-complete.json`、`axe-needs-review.json` |
| 动效修复与动态证据 | `motion/FINAL-MOTION-REPORT.md`、`final-regression-results.json`、`dynamic-summary.md`、`verified-dynamic.json` |
| 品牌原要求147条复核 | `requirements-review.json`、`requirements-review.md`、`original-requirements-xlsx.json`、`feishu-before.json` |
| 整合快照与激活 | `integrated/install.json`、`verification.json`、`activation.json`及两站build／test／lint日志 |
| 生产模式回归及测试修正 | `integrated/production-results.json`、`production-controls-rerun-results.json`、`production-controls-test-amendment.json` |
| 手机性能初始问题 | `integrated/performance.json`；后续修复结果另附，不覆盖原始观察 |
| 最终本地CMS内容 | `content/rendered-final.json`，发布ID `e3767acb-2380-4a25-8b61-47bdde41bdcd` |

最终补充证据：`integrated/final-verification.json`、`final-activation.json`、`final-motion-results.json`、`final-opening-results.json`、`performance-final.json`、`unprefixed-routes.json`、`brand-final-visual.json`、`brand-final-status.json`。本地原始证据目录保留首次失败和日志；对外整理包只包含公开页截图、合成动态录屏、报告和不含凭据的汇总。

- [更新后的飞书原清单](https://hcnbsg6ttb3t.feishu.cn/docx/AhN4dg0iqoJ3kHxV9kIcys92nn3)：147条G/H已更新，37处带日期的红框截图放回对应行，原A–F与历史图片保留。
- [代办](https://hcnbsg6ttb3t.feishu.cn/docx/UCFgdKhn2orJcXxgOiWcmPn9nVd)：24项材料／外部验收、10项范围／设计核对、性能与诊断残留、生产验证前置。
- 本机官网：http://127.0.0.1:4211/zh-hant；后台：http://127.0.0.1:4270/login。仅运行本项目的电脑可打开。
- 本轮不推送GitHub、不部署生产。源码保存在当前codex分支，随本报告提交；构建内容以第1节完整SHA-256为准。

可继续本地业务验收；正式交付仍需解决性能残留、完成材料与设计确认，以及目标生产环境与真实设备验收。没有观察到未解决P0／P1不等于证明未测环境零风险。

飞书写入后重新读取并逐格校验：原文档版本886、代办版本7，147行状态与本地113／24／10一致；原表A–F与241个历史图片块完整保留，新增38个图片块（37处放回对应行、1处16:4附技术记录）；《代办》含6个原生表格。验证结果见 `documents/readback-verification.json`。截图上的红框是本轮关注区域，不表示该截图中的所有硬件能力或视觉设计均已验收。
