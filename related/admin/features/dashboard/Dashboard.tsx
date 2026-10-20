import type { DashboardData } from "./service";
const actions: Record<string,string> = {
  'team.bootstrap':'初始化管理员', 'team.invited':'邀请员工', 'team.invite_created':'邀请员工', 'team.accepted':'接受员工邀请', 'team.changed':'更新员工权限',
  'content.saved':'保存草稿', 'content.submitted':'提交审核', 'content.published':'发布内容', 'content.rolled_back':'回退内容',
  'media.upload_created':'创建素材上传', 'system.media_validated':'完成素材校验', 'media.archived':'归档素材',
  'customers.note_added':'添加会员备注', 'waitlist.updated':'更新报名处理', 'waitlist.exported':'导出报名',
  'orders.created':'创建待付款订单', 'orders.cancelled':'取消订单', 'orders.note_added':'添加订单备注',
  'customers.anonymization_requested':'申请客户匿名化', 'customers.anonymization_resumed':'恢复匿名化任务',
  'customers.anonymization_failed':'匿名化任务失败', 'customers.anonymization_completed':'完成客户匿名化',
  'settings.catalog_updated':'更新产品方案', 'settings.commerce_updated':'更新下单设置',
};
export function Dashboard({ data }: { data: DashboardData }) {
  const cards = [
    ["会员", data.customers, "/customers"],
    ["候补报名", data.waitlist, "/waitlist"],
    ["订单", data.orders, "/orders"],
    ["内容草稿", data.drafts, "/content"],
  ] as const;
  return (
    <>
      <div className="settings-grid">
        {cards
          .filter(([, count]) => count !== null)
          .map(([label, count, url]) => (
            <section className="panel" key={label}>
              <h2>{label}</h2>
              <p>{count}</p>
              <a href={url}>查看{label}</a>
            </section>
          ))}
      </div>
      <section className="panel">
        <h2>最近操作</h2>
        <p>显示当前权限范围内最近10条记录。</p>
        {data.recentAudit.length ? (
          <ul>
            {data.recentAudit.map((e) => (
              <li key={e.id}>
                {new Date(e.createdAt).toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}{" "}
                · {actions[e.action] || "后台操作"} <details><summary>查看操作编号</summary><code>{e.action} · {e.entityId}</code></details>
              </li>
            ))}
          </ul>
        ) : (
          <p>暂无操作记录。</p>
        )}
      </section>
    </>
  );
}
