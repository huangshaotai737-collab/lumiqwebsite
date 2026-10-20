# SKU 与待付款配置订单

实际商业配置与 CMS 展示参考价相互独立。五款产品都有固定映射：ola、ola-go、tablet、print、nest（LumiQ Orb）。初始币种、金额为空，确认状态和启用状态为 false，订单开关关闭。Go 随 Ola 配套展示，任何身份都不能将它设置为独立收费 SKU。

管理员在 `/catalog` 明确填写币种最小单位整数、确认商业价格并启用 SKU，再审核当前已发布条款、批准该 release 并打开订单开关。后台修改使用当前数据库员工角色、共享团队锁、乐观版本、同事务审计。编辑和运营没有商品确认或订单开关权限。

允许币种：USD/EUR/GBP/TWD 的最小单位小数位为 2，JPY/KRW 为 0。来源为 [SIX ISO 4217 List One](https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/list-one.xml)，于 2026-10-20 核对，文件发布日期 2026-09-17。输入金额不自动换汇；允许记录某币种不代表未来支付服务支持它。

## 公开读取与 C4 接口

官网 `features/orders/service.ts` 导出 `getOrderingCatalog(): Promise<ApiResult<OrderingCatalog>>`，通过当前匿名或登录会话调用 `get_ordering_catalog()`。底层 fetch 一律 `no-store`。返回：

- `orderingEnabled`：当前商业开关和条款一致性允许提交；仍须由下单 RPC 验证身份、请求和每一个 SKU。
- `unavailableReason`：`ORDERING_DISABLED`、`TERMS_NOT_APPROVED`、`TERMS_CHANGED` 或 null。配置/数据库错误返回 ApiResult 错误，绝不能转成可下单或空的成功状态。
- `offerings`：仅 confirmed + enabled、且非 Go 的 SKU。每项恰含 skuId、productId、name、currency、unitMinor、version。目录有商品并不等于允许提交。
- `terms`：null 或 `{releaseId, locales}`。每种语言含 eyebrow、draft、terms（title/intro/p1/h1/p2/h2/p3/h3/p4/h4/p5）、shipping、returns、warranty。仅返回批准过的不可变已发布版本内容，不返回当前未批准变更。

C4 在禁用或不可用时继续以候补名单为主要入口。顾客应阅读与此批准版本相同的条款和三个商业承诺；下单的 `termsVersion` 使用 `terms.releaseId`，不使用随意的新首页 release。若当前公共 Terms 页面对应内容已变化，公开读取的可用状态关闭；不能仅链接变化后的页面后仍接受旧版本。C4 可渲染上述三语言批准文本。C3 不实现 checkout 页面。

## 条款指纹

批准操作只能选择当时 `content_publication.release_id`。数据库计算并保存固定范围指纹：对 en、zh-hant、ja 三种语言，包含 `messages.<locale>.Legal.eyebrow`、`Legal.draft`、`Legal.terms.{title,intro,p1,h1,p2,h2,p3,h3,p4,h4,p5}`，以及 `messages.<locale>.Products.{shipping,returns,warranty}`。每一叶须为字符串；精确实现以迁移中 `private.commercial_terms_payload` 为准。

现有 Terms renderer 及 SubPage/Heading 没有公开 settings 依赖；法律联系邮箱在 p5 中。Legal.draft 当前由不渲染的 DraftNotice 消费，仍保守纳入。增加 Terms renderer 数据依赖时，必须同步更新固定投影和指纹测试。没有将整个 CMS snapshot 或营销价格作为商业配置。无关首页发布保持可下单；任何上述法律/承诺变化需重新批准。历史订单 FK 保留原始批准 release。

## 下单、幂等和取消

`createOrder({idempotencyKey, items:[{skuId,quantity}], shippingAddress, termsVersion})`、`getOwnOrder(id)`、`listOwnOrders({page,pageSize})`、`cancelOrder(id)` 返回同步的 `contracts/commerce.ts` 类型。创建和取消先调用 `requireVerifiedUser`；所有客户 RPC 在数据库再次根据 auth.users 的真实 email_confirmed_at、非匿名状态和 active profile 验证。读取也要求当前有效已验证身份；表 RLS 只允许会员看到自己的订单/明细，没有客户表写入权限。

请求是严格字段白名单，禁止浏览器 userId、金额、状态、付款字段。数量为 1–99 整数、不重复 SKU、最多五行；金额、行金额和总计不得超出 JS 安全整数，单张订单仅一种币种。列表页码 1–1000000、每页 1–100。收件地址使用 C1 完整字段和已分配 ISO 国家码。幂等键为 8–128 位 ASCII 字母、数字、下划线或连字符。

同会员、同键、相同规范化请求返回原订单并标记 reused=true。请求体变化返回 CONFLICT；另一个会员的相同键独立。已存在订单的返回发生在当前价格、条款和订单开关检查之前，但仍在当前真实身份验证之后。取消后重试返回 cancelled，不重开订单。价格、名称、商品映射和版本以明细快照保留，不随目录改价改变。

锁顺序：身份 Auth/Profile share → 会员/幂等键 advisory → 新请求商业 shared advisory `7411111` → settings share → publication share → SKU share（按 UUID 顺序）。管理员写入是团队 `7410404` → 商业 exclusive `7411111` → 相关行锁；多次 SKU/设置 RPC 放在同一管理员事务时也保持一致。B2 发布是团队 `7410404` → 发布 `7410606` → publication 行；订单不请求团队锁，因此不会形成逆向等待。取消只请求身份、会员/键锁和订单行锁。不同请求可并行取得商业 shared 锁。

所有新订单固定为 pending_payment_setup / not_configured / not_scheduled。只保存 itemsMinor，小计不是最终扣款金额；shippingMinor、taxMinor、payableMinor 必须为 null。即使文案提到免运，也不据此填零。C5 付款前须补齐有效总价并取得顾客确认，本轮不收费、不扣库存。C6 运营/匿名化需专门的受控事务：当前没有给运营新增订单读取接口，订单归属 FK 会阻止直接删除 profile；不能删除或修改审计和发布历史来绕过匿名化流程。

## 本地验证

数据库测试须与浏览器 fixture 顺序运行。`supabase test db supabase/tests/database/orders.test.sql` 使用事务并回滚。并发复现建议 `node scripts/test-order-concurrency.mjs --local-test-only`，只连接本地 lumiq-platform PostgreSQL，独立会话真正到达生产锁后才解除确定性 barrier；durable private backup 与 finally 恢复用于失败清理。不可变合成发布和审计历史保留；本任务创建的用户、订单、目录配置在结束后恢复/移除。后台浏览器使用 `npm --prefix related/admin run test:e2e:catalog`，独立 4264 代码副本，不占用原预览端口。

## C4 顾客结账与运营界面

`/{locale}/checkout` 从公开商业投影映射购物车 product ID 到真实 SKU，不使用 CMS 参考价。不可用项逐项提示；Go 不能独立下单，含 Go 的购物车须明确移除 Go 后继续，不能静默替换。混合币种和超出安全整数的小计禁止提交。批准的不可变条款与三个承诺直接显示，提交其 releaseId。商品小计与待确认的运费/税额/最终应付额分开，任何状态均没有真实扣款。

顾客接口 `GET/POST /api/orders`、`GET /api/orders/:id`、`POST /api/orders/:id/cancel` 使用 `ApiResult`，私有 `no-store`。创建返回201；同请求复用返回200；冲突409。写入验证同源、当前有效已验证身份和数据库事务。可选 `x-lumiq-customer` 是旧界面的预期身份提示，必须与服务器实际身份一致；它不能授予身份。

首次发送前将原始请求、幂等键和已展示商业投影保存在当前标签页的 sessionStorage，按实际用户 ID 隔离。结果不明保留原请求，刷新后锁定资料并重试同一键；成功后清理并跳到本人订单。确定的输入错误允许修正，确定的开关关闭引导候补名单。显式登出清除待重试资料；切换账号忽略并移除另一账号的资料；跨标签页身份变化只广播无个人资料的随机标记。旧结账页重新聚焦时重新验证身份，期间隐藏表单。浏览器储存不含访问令牌。C7 应在部署域名及实际浏览器上继续验证 sessionStorage、Cookie 与返回路径行为。

`/{locale}/members/orders` 和详情从本人 API 读取，不把会员订单保存在共享缓存。前进/返回、聚焦及账号变更重新读取，失效请求结果不会覆盖新身份的显示。取消使用 C3 本人归属和状态事务；可重复取消且不可恢复原订单。

后台 `/orders` 仅管理员和运营可搜索订单/会员 ID、按状态分页、查看历史金额、收件资料、条款版本和取消记录并追加内部备注。`listOrders(query)` 返回 `ApiResult<Page<Order>>`；`getOrderForStaff(id)` 仍返回无备注的 `ApiResult<Order>`。`getStaffOrderDetail(id)` 的独立 DTO 包含 shippingAddress、termsVersion、cancelledAt 和 `{id,note,createdAt}[]`；`addOrderNote({id,note})` 返回 `ApiResult<null>`。没有手工已付款、发货或员工取消按钮。

追加迁移 `20261020190000_order_operations.sql` 添加 `public.order_notes`。它启用 RLS，对 anon/authenticated/service_role 没有直接表权限。四个安全定义者 RPC `list_staff_orders`、`get_staff_order`、`get_staff_order_detail`、`add_order_note` 仅 authenticated 可执行，内部按实时数据库员工状态授权。写备注使用团队锁7410404、订单 share 锁和同事务审计；审计仅存 noteId，不复制备注正文。顾客和标准员工 Order 投影明确不含内部备注。

C6 匿名化/删除受控事务必须先按目标订单清理 `order_notes` 的正文，再处理地址、订单和资料；不得删除不可变审计/发布历史。当前没有开放直接用户删除或通用订单写入权限。

本地顺序验收：官网 `npm --prefix related/website run test:e2e:orders`，后台 `npm --prefix related/admin run test:e2e:orders`，再单独运行订单 SQL 套件。显式配置分别使用隔离的4211/4266代码副本；不要与 SQL 数据填充用例并行。真实本地 Auth 用户、角色和订单仅用于合成测试，结束恢复原商业配置并删除自有备注/订单/用户，保留审计/发布历史。

C4 复审修复：只有 `create_customer_order` 返回可信的 SQLSTATE23505 且消息精确为 `terms changed` 时，服务端才映射为安全的 `TERMS_CHANGED`/HTTP409。该分支发生在当前身份与 owner/key 查找之后，证明新请求未提交；幂等键内容冲突仍是 `CONFLICT`，不会向浏览器发送数据库消息。界面仅在此确定结果下清除旧请求、刷新商业投影并要求重新接受新条款。传输/未知错误继续保留原请求与键。身份验证每个事件拥有独立递增代号，只有最新结果可重新显示表单，前进/返回恢复同样重新验证。

批准文本按规范文档的固定顺序显示 eyebrow、标题、intro、draft、p1/h1/p2/h2/p3/h3/p4/h4/p5，再显示三个承诺，不依赖 JSONB 键顺序。两应用测试通过薄适配器注入自己的 SDK 和本地 env 路径，复用 `scripts/tests/support/order-fixtures.mjs`。共享生命周期在执行 SDK/SQL 前验证本地 URL；用持久私有备份保存配置与发布指针/时间戳，finally 尝试恢复和清理，仅保留不可变发布/审计历史。此模块仅用于本地测试，没有生产运行时跨应用导入。

C5 已增加[支付关闭契约与准备入口](payment-integration.md)：后台管理员从系统设置查看材料顺序；官网 `POST /api/payments/checkout` 在同源、有效已验证身份、严格输入、共享限流与本人订单校验后仍返回503/PAYMENTS_NOT_CONFIGURED。五个 server-only 支付接口全部关闭，没有公开通知路由或真实交易。payment_attempts/payment_events/payment_refunds 是受限服务器预留表，唯一键去重且状态只允许 not_configured；C6 处理目标订单前须处理这些外键。浏览器成功回跳不能付款，最终报价与订阅均未实现。

C6 已实现默认关闭的受控匿名化：先暂停客户访问，正式 Auth 管理 API 禁用并清理联系资料，再原子清理 profile、订单收件快照和内部备注；保留金融明细、订单/付款外键、审计与发布历史。失败任务可由当前管理员查看并恢复，具体范围、品牌保留规则门槛及独立会话并发验证见[客户资料清理说明](customer-data.md)。
