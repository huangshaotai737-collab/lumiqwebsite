import type { DashboardData } from "./service";
import { AdminIcon } from "@/features/shell/AdminIcon";
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
      <div className="metrics-grid">
        {cards
          .filter(([, count]) => count !== null)
          .map(([label, count, url]) => (
            <section className="metric-card" key={label}>
              <div className="metric-heading"><h2>{label}</h2><span className="metric-icon" data-kind={url}><AdminIcon name={url === '/customers' ? '人' : url === '/waitlist' ? '单' : url === '/orders' ? '订' : '文'}/></span></div>
              <p className="metric-value">{count}</p>
              {url === "/content" && <small>编辑中与已提交审核的工作草稿总数。</small>}
              <a href={url}>查看{label}<AdminIcon name="arrow"/></a>
            </section>
          ))}
      </div>
      <div className="dashboard-columns">
      <section className="panel activity-panel">
        <div className="panel-heading"><span className="section-icon"><AdminIcon name="记"/></span><div><h2>最近操作</h2><p>显示当前权限范围内最近10条记录。</p></div></div>
        {data.recentAudit.length ? (
          <ul className="activity-list">
            {data.recentAudit.map((e) => (
              <li key={e.id}>
                <span className="activity-dot"/><div><strong>{actions[e.action] || "后台操作"}</strong><time>{new Date(e.createdAt).toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}</time><details><summary>查看操作编号</summary><code>{e.action} · {e.entityId}</code></details></div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="dashboard-empty"><AdminIcon name="记"/><p>暂无操作记录。</p></div>
        )}
      </section>
      <section className="panel quick-panel"><div className="panel-heading"><span className="section-icon"><AdminIcon name="台"/></span><div><h2>工作区导航</h2><p>进入当前权限下的管理模块</p></div></div><div className="quick-links">{cards.filter(([,count]) => count !== null).map(([label,,url]) => <a key={url} href={url}><span>{label}</span><AdminIcon name="arrow"/></a>)}</div><p className="workspace-hint">各模块保留独立页面，内容与操作权限以当前员工身份为准。</p></section>
      </div>
    </>
  );
}
