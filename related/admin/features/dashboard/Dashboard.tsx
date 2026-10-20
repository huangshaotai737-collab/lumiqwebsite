import type { DashboardData } from "./service";
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
                · {e.action} · {e.entityType} / {e.entityId}
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
