# LumiQ Members and Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入真实会员、候补名单、订单和支付预留契约，完成独立后台与现有官网的统一验收及交接。

**Architecture:** A 的身份和角色保护客户资料，B 的已发布内容供官网展示；订单由数据库事务计算和保存。前台会员界面替换本地账户演示入口，设备功能仍明确标识未接入；支付渠道保持关闭。

**Tech Stack:** Next.js、Supabase Auth/Postgres、Vitest、Playwright、pgTAP；无实际支付 SDK 或商户凭据。

**Spec:** [详细设计](../specs/2026-10-20-lumiq-admin-platform-design.md) 第 6–13 节；[总计划](./2026-10-20-lumiq-admin-platform.md)。先完成 A/B。

## Global Constraints

- 继承总计划全部约束；真实会员不能仅凭浏览器本地标志判断已登录，不能读取其他会员资料或内部备注。
- 公开购买开关初始关闭。订单初始为 `pending_payment_setup`，付款状态为未开通，配送状态为未安排。
- 金额采用币种最小单位整数，单笔订单只包含一种币种；参考价格不自动开启销售，Go 配件不单独收费。
- 未配置渠道统一返回 `PAYMENTS_NOT_CONFIGURED`。无真实扣款、自动续费、退款或发货。
- 手机检查 320/360/390/430 宽度及 820 平板；桌面 1440/1920；官网三语，浏览器模拟与真机实测分别记录。

## Review Focus

总计划第 5 条由 C3/C4 覆盖。C1 另测过期/重复邮件链接；C2 测导出公式注入；C6 测匿名化途中外部认证服务失败，禁止报告删除完成。

## C1：真实会员注册、重置与本人资料

**Files:** Create 官网 `features/account/{service.ts,AccountPanel.tsx,RegisterForm.tsx,ResetPasswordForm.tsx}`、`app/[locale]/register/page.tsx`、`app/[locale]/reset-password/page.tsx`、`app/api/account/profile/route.ts`、`app/api/auth/{register,reset}/route.ts`、`features/account/service.test.ts`、`tests/e2e/account-auth.spec.ts`；Modify A3 的官网登录/回调、`components/MembersArea.tsx`、`app/[locale]/members/page.tsx`、`app/[locale]/members/members.css`、三语 messages；Create `docs/admin/auth-email-setup.md`。

**Interfaces:** `getOwnProfile():Promise<ApiResult<Profile>>`；`updateOwnProfile(input:{displayName:string;locale:Locale;shippingAddress:ShippingAddress|null}):Promise<ApiResult<Profile>>`。`Profile={userId:UUID;displayName:string;locale:Locale;shippingAddress:ShippingAddress|null}`；`ShippingAddress={name:string;country:string;region:string;city:string;postalCode:string;line1:string;line2:string;phone:string}`，country 为 ISO 两位代码。类型置于 `contracts/core.ts` 并同步，内部备注永不进入 Profile。

- [ ] **1. 写失败测试。** `local_preview_is_not_an_account` 写入原 localStorage 后断言 `await expect(requireUser()).rejects.toThrow()`（使用未登录的会话 mock），不得创建设备或赋予权益；`profile_owner_only` 以会员 A 会话直接查 B 后断言 `expect(rows).toHaveLength(0)`。注册后须验证邮箱；未验证不能提交订单；验证/重置链接过期、重复、缺 code 有明确提示；外部 redirect 被拒绝。
- [ ] **2. 验证失败。** Run 官网 `test -- features/account/service.test.ts` 与 `test:e2e:platform -- account-auth.spec.ts`，预期缺资料服务/注册功能 FAIL。
- [ ] **3. 实现账号与资料。** 复用 A3 的官网认证客户端；注册、验证、重置和退出使用真实 Auth，注册/重置入口验证来源并限制每 IP 5 次/15 分钟，反馈不泄露邮箱是否已注册。本地邮件捕获器验证链接流程；正式 SMTP 未配置时不宣称生产邮箱已联通。会员页保留原视觉风格但呈现真实登录/本人资料，设备卡改为明确未接入状态，不发送假的控制请求。
- [ ] **4. 验证通过。** 单测、SQL 身份测试及浏览器邮件全流程 PASS；资料长度限制、收件地址换行、三语错误反馈及登录失效均可用。公开页面/会员页面缓存边界正确。
- [ ] **5. 提交。** `feat: connect verified customer accounts and private profiles`。

## C2：会员与候补名单的真实运营列表

**Files:** Create `*_customer_operations.sql`、`supabase/tests/database/customer-operations.test.sql`；后台 `features/customers/{service.ts,CustomerTable.tsx,CustomerDetail.tsx}`、`features/waitlist/{service.ts,csv.ts,WaitlistTable.tsx}`、`app/(protected)/customers/page.tsx`、`app/(protected)/waitlist/page.tsx`、`app/api/waitlist/{list,update,export}/route.ts`、`features/waitlist/waitlist.test.ts`、`tests/e2e/customer-operations.spec.ts`；Modify 官网 `app/api/waitlist/route.ts`、`tests/waitlist-route.test.ts`；不改变现有报名去重语义。

**Interfaces:** `CustomerSummary={id:UUID;displayName:string;email:string;createdAt:string}`，邮箱来自受限客户查询 RPC，不向会员/编辑开放 auth.users；`WaitlistSummary={id:UUID;email:string;source:string;consentVersion:string;createdAt:string;status:'new'|'contacted'|'closed';note:string;version:number}`。`listCustomers(query:{search:string;page:number;pageSize:number}):Promise<ApiResult<Page<CustomerSummary>>>`；`addCustomerNote(input:{userId:UUID;note:string}):Promise<ApiResult<null>>` 仅 admin/operations；`listWaitlist(query:{search:string;status:'all'|'new'|'contacted'|'closed';page:number;pageSize:number}):Promise<ApiResult<Page<WaitlistSummary>>>`；`updateWaitlist(input:{id:UUID;status:'new'|'contacted'|'closed';note:string;expectedVersion:number}):Promise<ApiResult<null>>`；`exportWaitlist(query):Promise<Response>` 返回 UTF-8 CSV，query 与 listWaitlist 相同。报名处理状态/版本与内部备注存独立表，不改变原 email/同意版本。

- [ ] **1. 写失败测试。** `editor_cannot_export_waitlist` 断言 `expect(response.status).toBe(403)`；`csv_formula_is_inert` 从 `=1+1` 构造备注，断言 `expect(csv).toContain("'=1+1")`，同时正确转义引号/逗号/换行。匿名不能读取邮箱；admin/operations 分页筛选正确；重复报名不重复建行；保存失败返回失败；CSV 对以 `+ - @`、制表符或回车开头同样保护，无可用审计时不导出。
- [ ] **2. 验证失败。** Run 后台 `test -- features/waitlist/waitlist.test.ts`、官网 `test -- tests/waitlist-route.test.ts` 和 SQL customer-operations 测试，预期新增权限/运营能力缺失 FAIL。
- [ ] **3. 实现持久化列表、备注和导出。** pageSize 默认 25、最大 100，按 created_at/id 稳定排序，搜索参数化；备注上限 2000 字符，版本冲突返回 CONFLICT。导出仅过滤范围，最多 10000 行，限每员工 5 次/小时，先确认数据库可读并写导出范围审计再返回，不记录完整邮箱内容。
- [ ] **4. 验证通过。** 单测/SQL/浏览器测试 PASS；官网真实 POST → 后台出现 → 重复 POST 仍一条 → 备注/状态/CSV/审计贯通。本地验证与现有生产是否配置分别记录；报名限流默认 5 次/15 分钟/IP，不向匿名暴露名单查询。
- [ ] **5. 提交。** `feat: manage customer records and waitlist operations`。

## C3：经确认的 SKU、服务器报价与订单事务

**Files:** Create `contracts/commerce.ts`、`*_orders_and_catalog.sql`、`supabase/tests/database/orders.test.sql`、`supabase/tests/database/order-concurrency.test.sql`；后台 `features/catalog/{service.ts,CatalogEditor.tsx}`、`app/(protected)/catalog/page.tsx`、`app/api/catalog/update/route.ts`、`features/catalog/catalog.test.ts`；官网 `features/orders/{schema,service}.ts`、`features/orders/service.test.ts`。

**Interfaces:** `OrderTotals={itemsMinor:number;shippingMinor:number|null;taxMinor:number|null;payableMinor:number|null}`；`Order={id:UUID;userId:UUID;status:'pending_payment_setup'|'cancelled';paymentStatus:'not_configured';fulfillmentStatus:'not_scheduled';currency:string;totals:OrderTotals;items:OrderItem[];createdAt:string}`。`OrderItem={skuId:UUID;productId:ProductId;name:string;quantity:number;unitMinor:number}`；`CreateOrderResult={order:Order;reused:boolean}`。`createOrder(input:{idempotencyKey:string;items:{skuId:UUID;quantity:number}[];shippingAddress:ShippingAddress;termsVersion:string}):Promise<ApiResult<CreateOrderResult>>`；`getOwnOrder(orderId:UUID):Promise<ApiResult<Order>>`；`listOwnOrders(query:{page:number;pageSize:number}):Promise<ApiResult<Page<Order>>>`；`cancelOrder(orderId:UUID):Promise<ApiResult<Order>>`；数据库 RPC `create_customer_order`、`cancel_customer_order`；`setCatalogOffering(input:{skuId:UUID;currency:string;unitMinor:number;confirmed:boolean;enabled:boolean;expectedVersion:number}):Promise<ApiResult<null>>` 仅 admin。新订单 termsVersion 必须等于管理员确认的已发布条款 releaseId；这些类型定义在 contracts/commerce.ts 并同步。

- [ ] **1. 写失败测试。** `same_customer_retry_is_one_order` 以同一已验证会话重复 createOrder，先收窄两次成功结果，再断言 `expect(first.data.order.id).toBe(second.data.order.id)` 与 `expect(second.data.reused).toBe(true)`；`client_price_is_not_trusted` 传入额外金额字段后断言 `expect(result).toMatchObject({ok:false,error:'INVALID_INPUT'})`。未登录/邮箱未验证/开关关闭/未确认 SKU/Go 独立收费均拒绝；非整数、负数、超 99、混币种或超 JS 安全整数均拒绝；B 相同键为另一归属，同一键改请求体返回 CONFLICT；历史明细不随价格改变，取消后重试不会重新开单。
- [ ] **2. 验证失败。** Run SQL orders/order-concurrency 测试及官网 `test -- features/orders/service.test.ts`，预期缺事务 FAIL。
- [ ] **3. 实现 SKU 与原子下单。** 五款产品均有展示映射，实际 SKU 初始未确认、提交开关关闭；管理员确认实际价格和商业条款后方可启用。验证身份与请求摘要后，同会员已成功的幂等键直接返回原订单，不因当前价格/条款改变重新计价；请求摘要不同则冲突。新请求在事务中锁定有效 SKU/价格版本并计算同单一致金额，只保存允许字段，不接受浏览器 userId、金额或付款状态。
- [ ] **4. 验证通过。** 单测、并发 SQL、RLS 全部 PASS。待开放订单保存商品小计；未确定运费/税费保留 null，界面明确“待确认”，不填零或声称最终扣款金额。未来付款前必须补齐有效总价并由顾客确认，本轮 payableMinor 为 null，不做库存扣减。
- [ ] **5. 提交。** `feat: persist validated customer orders with idempotent pricing`。

## C4：顾客下单、本人订单与运营处理界面

**Files:** Create 官网 `features/orders/{CheckoutForm.tsx,OrderList.tsx,OrderDetail.tsx}`、`app/[locale]/checkout/page.tsx`、`app/[locale]/members/orders/[id]/page.tsx`、`app/api/orders/route.ts`、`app/api/orders/[id]/route.ts`、`app/api/orders/[id]/cancel/route.ts`、`tests/e2e/customer-orders.spec.ts`；Modify `components/cart/CartDrawer.tsx`、`features/account/AccountPanel.tsx`、三语 messages；Create 后台 `features/orders/{service.ts,OrderTable.tsx,OrderDetail.tsx}`、`app/(protected)/orders/page.tsx`、`app/(protected)/orders/[id]/page.tsx`、`tests/e2e/order-operations.spec.ts`。

**Interfaces:** 顾客 GET /api/orders 返回 `ApiResult<Page<Order>>`，POST 返回 `ApiResult<CreateOrderResult>`，GET /api/orders/:id 和 POST /api/orders/:id/cancel 返回 `ApiResult<Order>`；`listOrders(query:{search:string;status:'all'|'pending_payment_setup'|'cancelled';page:number;pageSize:number}):Promise<ApiResult<Page<Order>>>`、`getOrderForStaff(id:UUID):Promise<ApiResult<Order>>`、`addOrderNote(input:{id:UUID;note:string}):Promise<ApiResult<null>>` 仅 admin/operations。请求体、来源验证和 ApiResult 统一，新建 HTTP 201，reused 为 true 时 HTTP 200，冲突 409。

- [ ] **1. 写失败测试。** `switch_account_hides_previous_orders` 切换账号后断言 `await expect(page.getByText(previousOrderId)).toHaveCount(0)`；`retry_checkout_reuses_order` 双击/超时重试后断言数据库仅一单。开关关闭时购物车可操作但提交引导候补名单；登录返回安全站内结账地址；结果不明保留幂等键；会员猜别人的 ID 与 editor 直接进入运营详情均拒绝。
- [ ] **2. 验证失败。** Run 官网 `test:e2e:platform -- customer-orders.spec.ts` 与后台 `test:e2e -- order-operations.spec.ts`，预期缺页面/接口 FAIL。
- [ ] **3. 实现上下游界面。** 显示“支付尚未开放，提交不会扣款，也不代表已确认购买”；收件资料、商品小计、待确认运税和条款版本清楚呈现，成功后只显示待支付开放。后台可搜索、查看、备注和读取消记录，无手工改已付款/发货按钮；取消通过 C3 事务验证归属与状态。
- [ ] **4. 验证通过。** 两组浏览器用例、订单 SQL 与既有 cart 单测 PASS；刷新、返回、取消重复请求、网络失败有正确状态，购物车弹窗焦点/滚动恢复不退化。日志不回传给顾客，备注不在公共/会员数据载荷中。
- [ ] **5. 提交。** `feat: connect customer checkout and order operations`。

## C5：支付契约关闭实现与准备材料入口

**Files:** Create 官网 `lib/payments/{types,disabled,service}.ts`、`app/api/payments/checkout/route.ts`、`tests/payments-disabled.test.ts`；Create `*_payment_contracts.sql`、`supabase/tests/database/payment-contracts.test.sql`；Modify 后台 `app/(protected)/settings/page.tsx`；Create `docs/admin/payment-integration.md`，引用现有支付准备清单。

**Interfaces:** `PaymentGateway` 具有 `createCheckout(input:{orderId:UUID;idempotencyKey:string})`、`queryTransaction(input:{attemptId:UUID})`、`handleVerifiedEvent(input:{eventId:string;transactionId:string;orderId:UUID;amountMinor:number;currency:string})`、`requestRefund(input:{orderId:UUID;amountMinor:number;idempotencyKey:string})`、`queryRefund(input:{refundId:UUID})`，均返回 `Promise<ApiResult<PaymentResult>>`；`PaymentResult={reference:string;status:string}`，仅服务端使用。公开通知接收入口本轮不注册；未来 provider verifier 必须先构建不可由外部 JSON 直接获得的已验证事件，再调用内部事件处理函数。

- [ ] **1. 写失败测试。** `payment_is_disabled` 对五个接口逐项断言 `expect(result).toMatchObject({ok:false,error:'PAYMENTS_NOT_CONFIGURED'})`；checkout API 未登录 401，本人有效订单 503。`browser_success_cannot_pay_order` 断言访问 success URL 前后 paymentStatus 均为 not_configured；任意通知 JSON 同样无效；数据库拒绝普通用户或员工直接写付款成功，无测试 provider 进入生产 bundle。
- [ ] **2. 验证失败。** Run 官网 `test -- tests/payments-disabled.test.ts` 及 SQL payment-contracts 测试，预期缺契约 FAIL。
- [ ] **3. 实现关闭适配器和表。** `payment_attempts`、事件去重、退款记录有唯一键及服务器权限，未接渠道不产生成功记录；本轮不调用实际支付 API、不内置 PayPal/ECPay 测试密钥。未来扩展需核验商户/金额/币种/订单，不能从浏览器回跳或后台按钮直接付款成功。
- [ ] **4. 验证通过。** 单测/SQL PASS；后台显示支付未开通及材料清单入口，说明台湾主体、候选渠道、商户审核、币种、正式域名、条款、配送/退款、沙箱与正式凭据的准备顺序；明确订阅不在已实现范围。
- [ ] **5. 提交。** `feat: reserve payment contracts with collection disabled`。

## C6：管理员匿名化与真实工作台汇总

**Files:** Create `*_customer_privacy.sql`、`supabase/tests/database/customer-privacy.test.sql`；后台 `features/customers/{privacy.ts,PrivacyAction.tsx}`、`features/dashboard/{service.ts,Dashboard.tsx}`、`app/api/customers/anonymize/route.ts`、`features/customers/privacy.test.ts`、`features/dashboard/service.test.ts`；Modify 后台工作台 `app/(protected)/page.tsx`；Create `docs/admin/customer-data.md`。

**Interfaces:** `requestAnonymization(input:{userId:UUID;reason:string}):Promise<ApiResult<{jobId:UUID;status:'pending'|'completed'|'failed'}>>`；`resumeAnonymization(jobId:UUID):Promise<ApiResult<{status:'completed'|'failed'}>>`；`getDashboard():Promise<ApiResult<{customers:number|null;waitlist:number|null;orders:number|null;drafts:number|null;recentAudit:AuditSummary[]}>>`，角色无权查看的统计为 null，界面不显示该项，读取失败返回 error 而非伪造 0。SQL `anonymize_customer_data` 清理 profile、收件快照和运营备注中的客户个人资料，保留无个人资料的订单金额明细/必要审计；Auth 禁用结果与任务状态独立记录，失败可恢复。

- [ ] **1. 写失败测试。** `failed_auth_step_is_not_complete` 注入 Auth 管理 API 失败，断言 `expect(result.data.status).not.toBe('completed')`（先断言 API 已成功返回任务状态）；仅 admin 能发起，禁止对员工身份发起客户匿名化；保留规则未配置时拒绝。重复任务不重复修改，目标客户在任务启动后不能再访问私人数据；并发更改不写回旧地址，editor 不获得客户明细或审计隐私。
- [ ] **2. 验证失败。** Run 后台 `test -- features/customers/privacy.test.ts features/dashboard/service.test.ts` 和 SQL privacy 测试，预期未实现 FAIL。
- [ ] **3. 实现权限和状态流程。** 先以事务暂停目标客户数据访问，再通过正式 Auth 管理 API 禁用身份并匿名化其联系/用户资料，清理应用内个人资料，步骤可幂等恢复；不删除认证身份导致订单外键断裂。文档区分应用可清理范围和认证服务自身日志保留，不声称已删除服务商保留的所有数据。保留规则未由品牌确认前生产按钮关闭，测试规则仅用于隔离测试。工作台按角色汇总实际数据，失败显示不可用而非 0，未开放支付不显示营收。
- [ ] **4. 验证通过。** 单测/SQL PASS；管理员能查看并恢复失败任务；审计只含对象、动作和必要摘要，不保留被清理资料全文。后台各模块有搜索/分页/空态/错误态，停用与不同角色导航一致。
- [ ] **5. 提交。** `feat: add controlled customer anonymization and real dashboard metrics`。

## C7：完整回归、持续集成与部署交接

**Files:** Create `.github/workflows/admin-platform.yml`、`scripts/verify-platform.mjs`、`related/website/tests/e2e/platform-regression.spec.ts`、`related/admin/tests/e2e/admin-responsive.spec.ts`、`docs/admin/{deployment,operations,acceptance}.md`；Modify 根目录 `README.md`、`迁移与协作.md`；保留原 `.github/workflows/browser-platform-audit.yml`。

**Interfaces:** `node scripts/verify-platform.mjs` 顺序执行契约漂移、SQL 权限、两站单测/类型/lint/build及指定浏览器集成，任一失败退出非零；默认只运行本地/CI 配置，禁止连接未明示允许的生产项目。验收报告逐项记录实际环境、commit、通过/失败/待配置，不伪造已测真机或生产结果。

- [ ] **1. 建立回归断言。** `no_horizontal_overflow` 断言 `expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 1)`；`five_product_entries_survive_resize` 使用现有五产品 ID 定位断言存在且桌面完整落地显示五项。首页首次加载/失败/缩小再放大、影片/家庭滑动、菜单/购物车/FAQ/候补、登录/重置/预览/订单，在三语手机 320/360/390/430/820 和桌面 1440/1920 无重叠；后台停机时官网可读，数据库/邮件/上传失败和过期会话均显示真实错误。
- [ ] **2. 验证回归测试能发现问题。** 在测试 fixture 注入越权响应、五卡缺项、保存假成功等故障，断言相应用例失败；撤销 fixture 故障，不通过改弱断言消除失败。为无变化的纯展示元素不写镜像实现测试。
- [ ] **3. 完善 CI 与交接。** Node 22，固定依赖，开启 Git LFS；本地数据库与临时测试账号由 CI 创建并清理，无真实 PII。生成类型/契约检查不允许漂移。部署文档分别写明两站根目录、环境变量、SMTP、域名白名单、首管理员、数据迁移、备份恢复及回退；无生产配置则列出阻断项，不自动上线。
- [ ] **4. 执行最终检查。** 总验证命令全部 PASS；桌面/手机截图人工查看，注册→报名→后台→订单贯通，按三角色逐一请求权限矩阵。现有跨平台工作流保留；能实测的浏览器和设备据实登记，未测的保留状态。最终按所选执行方式完成独立代码复核并修复有效发现。
- [ ] **5. 提交与交付。** `test: verify admin platform and document deployment handoff`；提供后台与官网本地地址、测试登录方式、分支/提交及使用说明，区分本地实现、云端测试和生产可用状态。GitHub 推送、生产部署或正式支付启用需依用户当时指令执行，本计划不自动执行这些操作。
