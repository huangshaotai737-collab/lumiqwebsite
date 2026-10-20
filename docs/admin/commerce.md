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
