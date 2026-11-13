import type { DashboardData } from "./service";
import { AdminIcon } from "@/features/shell/AdminIcon";
const actions: Record<string,string> = {
  'team.bootstrap':'初始化管理員', 'team.invited':'邀請員工', 'team.invite_created':'邀請員工', 'team.accepted':'接受員工邀請', 'team.changed':'更新員工權限',
  'content.draft_deleted':'刪除草稿', 'content.release_deleted':'刪除發佈記錄', 'content.image_removed':'移除官網圖片',
  'content.saved':'保存草稿', 'content.submitted':'提交審覈', 'content.published':'發佈內容', 'content.rolled_back':'回退內容',
  'media.upload_created':'創建素材上傳', 'system.media_validated':'完成素材校驗', 'media.archived':'歸檔素材',
  'customers.note_added':'添加會員備註', 'waitlist.updated':'更新報名處理', 'waitlist.exported':'導出報名',
  'orders.created':'創建待付款訂單', 'orders.cancelled':'取消訂單', 'orders.note_added':'添加訂單備註',
  'customers.anonymization_requested':'申請客戶匿名化', 'customers.anonymization_resumed':'恢復匿名化任務',
  'customers.anonymization_failed':'匿名化任務失敗', 'customers.anonymization_completed':'完成客戶匿名化',
  'settings.catalog_updated':'更新產品方案', 'settings.commerce_updated':'更新下單設置',
};
export function Dashboard({ data }: { data: DashboardData }) {
  const cards = [
    ["會員", data.customers, "/customers"],
    ["候補報名", data.waitlist, "/waitlist"],
    ["訂單", data.orders, "/orders"],
    ["內容草稿", data.drafts, "/content"],
  ] as const;
  return (
    <>
      <div className="metrics-grid">
        {cards
          .filter(([, count]) => count !== null)
          .map(([label, count, url]) => (
            <section className="metric-card" key={label}>
              <div className="metric-heading"><h2>{label}</h2><span className="metric-icon" data-kind={url}><AdminIcon name={url === '/customers' ? '人' : url === '/waitlist' ? '單' : url === '/orders' ? '訂' : '文'}/></span></div>
              <p className="metric-value">{count}</p>
              {url === "/content" && <small>編輯中與已提交審覈的工作草稿總數。</small>}
              <a href={url}>查看{label}<AdminIcon name="arrow"/></a>
            </section>
          ))}
      </div>
      <div className="dashboard-columns">
      <section className="panel activity-panel">
        <div className="panel-heading"><span className="section-icon"><AdminIcon name="記"/></span><div><h2>最近操作</h2><p>顯示當前權限範圍內最近10條記錄。</p></div></div>
        {data.recentAudit.length ? (
          <ul className="activity-list">
            {data.recentAudit.map((e) => (
              <li key={e.id}>
                <span className="activity-dot"/><div><strong>{actions[e.action] || "後臺操作"}</strong><time>{new Date(e.createdAt).toLocaleString("zh-CN", {
                  timeZone: "Asia/Shanghai",
                })}</time><details><summary>查看操作編號</summary><code>{e.action} · {e.entityId}</code></details></div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="dashboard-empty"><AdminIcon name="記"/><p>暫無操作記錄。</p></div>
        )}
      </section>
      <section className="panel quick-panel"><div className="panel-heading"><span className="section-icon"><AdminIcon name="臺"/></span><div><h2>工作區導航</h2><p>進入當前權限下的管理模塊</p></div></div><div className="quick-links">{cards.filter(([,count]) => count !== null).map(([label,,url]) => <a key={url} href={url}><span>{label}</span><AdminIcon name="arrow"/></a>)}</div><p className="workspace-hint">各模塊保留獨立頁面，內容與操作權限以當前員工身份爲準。</p></section>
      </div>
    </>
  );
}
