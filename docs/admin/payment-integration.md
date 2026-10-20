# 支付关闭契约与接入准备

后台管理员 `/settings#payment-preparation-checklist` 提供准备入口。完整主体、渠道官方来源与核实日期见[支付接入准备清单](../superpowers/specs/2026-10-20-lumiq-payments-readiness.md)，订单及金额约束见[商业接口说明](commerce.md)。本页只说明本轮工程边界；候选渠道不代表已获商户批准。

台湾主体先确认公司、负责人、收款账户和首批售卖 SKU，再向候选渠道确认商户资格、销售地区、计价/结算币种及审核资料；补齐正式 HTTPS 域名、客服、服务/隐私条款、配送、税费及退款政策；商户审核通过后准备沙箱账户与凭据并联调，沙箱验收后才准备正式凭据和品牌方安排的正式验收。证件由品牌方直接提交平台，凭据通过服务器部署配置管理。已同步的准备清单列有 PayPal、绿界与其他候选资格注意事项，适用性以实际获批产品为准。本轮不开户、不创建交易、不调用渠道 SDK/API。付费订阅、自动续费及真实退款未实现。

## 服务器接口

官网 `lib/payments/types.ts` 为 server-only。`PaymentGateway` 的 createCheckout({orderId,idempotencyKey})、queryTransaction({attemptId})、handleVerifiedEvent(VerifiedPaymentEvent)、requestRefund({orderId,amountMinor,idempotencyKey})、queryRefund({refundId}) 均返回 `Promise<ApiResult<PaymentResult>>`，PaymentResult 恰为 `{reference:string,status:string}`。固定 disabledGateway 对五个接口无条件返回 PAYMENTS_NOT_CONFIGURED，不读环境开关，不发网络请求，不写记录。

POST `/api/payments/checkout` 接受且只接受 `{orderId:UUID,idempotencyKey:string}`（8–128 位 ASCII 字母/数字/下划线/连字符）。它校验同源、真实有效且邮箱已验证的会话、严格请求体、共享 write 限流，再通过当前用户会话的 getOwnOrder/数据库 RPC 验证归属，最后返回503/PAYMENTS_NOT_CONFIGURED。未登录401，未验证/停用403，他人或不存在订单404，输入400，限流429；响应 private/no-store。金额、付款状态、userId 等浏览器字段无法进入契约。没有公开支付通知或 success 路由；访问带 success/paid 查询参数的订单页面不会修改付款。

## 已验证事件的未来边界

VerifiedPaymentEvent 包含 eventId、transactionId、orderId、amountMinor、currency 及不可从外部 JSON 获得的私有 unique-symbol 类型标记。本轮没有构造器、JSON 转换器或伪 verifier。此标记仅是编译期来源约束，**不是**运行时签名、商户或金额验证。未来必须由选定渠道的真实服务器 verifier 按官方规范验证签名/可信查询结果、商户、订单、金额、币种及事件/交易标识，再受控构造已验证事件，才可调用内部处理器。当前处理器即便收到强制转换的未验证对象也只返回关闭错误。

真正启用前另行设计最终报价、顾客确认、通知重放、事务锁、审计与对账。当前 shippingMinor/taxMinor/payableMinor 仍为 null，商品小计不能用于实际扣款。浏览器回跳、后台按钮及原始通知 JSON 都不能将订单置为已付款。

## 数据库预留

追加迁移 `20261020200000_payment_contracts.sql` 创建 RLS 表 payment_attempts、payment_events、payment_refunds。尝试/退款以(order_id,idempotency_key)唯一，事件以(provider,event_id)唯一，避免不同渠道事件号冲突。金额使用有 JS 安全上限的最小单位整数，引用真实订单；不保存原始通知正文或凭据。

anon/authenticated（包含所有员工）无直接表权限。service_role 仅保留 SELECT/INSERT 的服务器存储权限，无 UPDATE/DELETE；本轮没有运行时写入者。三表状态约束仅允许 not_configured，不能插入成功事件/交易/退款，即使服务器角色也不能通过这些表绕过 customer_orders 的独立 not_configured/空最终价约束。没有为了“预留”而开放付款状态写 RPC。未来启用须另行审核迁移、授权与真实 verifier，不靠设置环境变量解锁。

C6 受控匿名化保留订单、payment_events/payment_refunds/payment_attempts 及其外键，只清理收件快照与客户/订单内部备注，不删除不可变审计/发布历史。保留规则默认未确认，完整范围与失败恢复见[客户资料清理说明](customer-data.md)。本轮正常路径不会产生付款记录。
