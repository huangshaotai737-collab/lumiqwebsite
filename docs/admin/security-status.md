# 依赖与安全验收边界（2026-10-20）

> 2026-10-21 更新：本轮重新执行两站生产依赖审计，结果均为 0；重新执行本地数据库安全 advisor，未报告问题。原 N1 与 ref cleanup lint 警告已修正。新增产品图发布来源、直接下单 RPC 配额、导出同源保护等修复及完整范围见 [本轮走查报告](audit-2026-10-21.md)。下列开发依赖和运行环境限制仍保留，历史审查结论不替代新证据。

官网保持 Next 15，锁定 Next / eslint-config-next 15.5.27，sharp 0.35.5、source-map-js 1.2.2。另将已有开发依赖 override brace-expansion 更新为1.1.21、js-yaml 更新为4.3.2，保留与当前 ESLint 9 兼容的主版本。安装只发生在本任务的独立运行副本，不替换原预览正在使用的 node_modules。

核对的上游公告：

- Next Windows RCE：[GHSA-p293-qw3h-jr36](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)，15.5.24修复。
- Next AVIF 图像优化 RCE：[GHSA-2xp9-vwfh-vxw4](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)，15.5.24修复。
- Next SSG/ISR缓存污染：[GHSA-4jqv-mc3x-m676](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676)、[GHSA-mcj8-r9mp-w47p](https://github.com/vercel/next.js/security/advisories/GHSA-mcj8-r9mp-w47p)，15.5.27覆盖相应修复。
- sharp / librsvg：[GHSA-wq5f-xc86-pv6w](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)，0.35.5带修复后的二进制依赖。
- source-map-js：[上游修复](https://github.com/7rulnik/source-map-js/releases/tag/v1.2.2)，对应 [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)。
- 开发工具：[js-yaml公告](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh)，[brace-expansion公告](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p)及相关 [嵌套递归](https://github.com/advisories/GHSA-qhr7-859c-m2p7)、[CPU消耗](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr)。

两站完整 audit 仍可能报告5项高危开发依赖链：`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`。公告 [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 影响 braces 全部当前发布版本，深层嵌套 glob 可耗尽调用栈。2026-10-20 npm registry 的最新版本仍为3.0.3，没有兼容修补版本；不使用 audit 推荐的 Next ESLint 14降级来掩盖它。

该链位于构建/lint开发工具，不是应用对访客开放的输入处理器；运行时生产依赖审计单独执行并记录。这里只处理仓库中的可信路径和配置；CI设置执行时间上限。工具链负责人在 braces 上游发布补丁后需更新锁文件并重跑 lint/构建。不能声称完整依赖树零漏洞，也不能把开发链分类当作对所有使用方式都不存在风险的证明。

数据库 `audit_events` 的 `audit_read_admin` 与 `audit_read_own_category` 形成 multiple_permissive_policies 性能建议；这是两条独立读取授权条件的组合，不是新增越权。保留管理员全量与员工本人分类日志的既有语义，角色可见性由 SQL/浏览器测试覆盖。后续仅在实际性能数据证明必要时由数据库负责人合并等价条件，不能为消除提示扩大权限。

开发构建可能显示 webpack 大字符串缓存序列化性能警告。大型初始快照属于已批准内容，不为隐藏日志改变网站配置。刻意损坏刷新令牌的场景会出现 Supabase Auth 验证错误；合成故障明确记录，不输出令牌/密码。具体最终输出及运行限制见验收报告。

本轮独立安装的两站 `npm explain braces --json` 都把 `braces@3.0.3` 标为 `dev: true`，完整 audit 各5项高危；`npm audit --omit=dev --audit-level=low` 两站均为0。registry `npm view braces version` 返回3.0.3。该公告精确影响范围为 `<=3.0.3`、无 patched version，深层 brace AST 递归可能抛出未捕获 RangeError，造成工具进程不可用；此处风险由可信仓库输入和 CI 90分钟执行上限限制，不把它说成已经修复。

Node 22.23.3 开发预览连续导航中曾输出 `TypeError: controller[kState].transformAlgorithm is not a function`。官方 [Node #62036](https://github.com/nodejs/node/issues/62036) 与[修复 #62040](https://github.com/nodejs/node/pull/62040)说明取消读取和延迟写入的竞争；[v22.23.3 源码](https://github.com/nodejs/node/blob/v22.23.3/lib/internal/webstreams/transformstream.js)仍存在该调用。本地以完全相同 Node 22.23.3、仅使用原生 TransformStream 的 `reader.cancel()` 与 `writer.write()` 重现同一内部堆栈，进程随后仍正常执行。应用日志没有完整堆栈，故导航取消是有证据的机制推断，不声称已逐请求追踪原因。九个拒绝预览导航均验证404、单一可用本地化外壳、无草稿泄露、无 browser pageerror，最后首页200；未压制服务端日志，也不声称服务端零错误。部署前在实际选定 Node/Next 运行环境复核流取消健康度，若普通完整加载出现持续500或进程退出，应阻断上线并排查。

独立安装还输出 ESLint9.39.5停止支持的弃用提示。当前Next ESLint兼容链未在本任务跨主版本升级；后续工具链升级需另行验证。该提示与上述已核验的braces漏洞记录分开，不将弃用提示当作运行时漏洞。


### 最终审查修复验证

本轮关闭了经实际双标签页本地 Auth 复现的跨账户资料覆盖/改密缺陷：客户端身份绑定只限制当前服务器认证主体；缺失、格式错误和不匹配在写入前拒绝。真实浏览器验证 B 的原密码有效且被尝试的替换密码无效；旧读取和保存结果不能在身份代次变化后恢复 A 的资料。运营新增权限仅为私有配置读取，HTTP、服务及 SQL 写入限制保持管理员专属。原始媒体空 ID 的 URL 绕过在共享校验和 SQL 选择/发布处被拒绝。

本轮限于本地合成数据与回滚事务，没有重新刷新依赖审计、执行生产部署、真实邮件或付款，以上依赖与运行时诊断限定继续成立。回退告警只输出固定类别/来源与验证后的 UUID，禁止原始异常、凭据、快照及个人信息。


最终独立复核在功能提交920d7d6确认原I1/I2/I3/M1/M2均已解决，未建立新Critical/Important；详细范围/证据见reviews/2026-10-20-scoped-rereview.md。N1是成功重置密码后附带过期提示的显示问题，已明确留作后续，不撤销实际身份绑定/密码验证证据。官网lint存在一条use-account-identity ref cleanup警告（退出0），没有把它描述为零警告。既有开发依赖、Node取消诊断、生产/真机未验收等限制继续有效。
