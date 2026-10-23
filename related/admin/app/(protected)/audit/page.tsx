import { requireStaff } from '@/lib/auth/require-staff';
import { createClient } from '@/lib/auth/server';
export default async function AuditPage() {
  let staff;
  try {
    staff = await requireStaff(['admin', 'editor', 'operations']);
  } catch {
    return <p role="alert">操作记录暂不可用，请检查权限或稍后重试。</p>;
  }
  const client = await createClient();
  const { data, error } = await client
    .from('audit_events')
    .select('id,actor_id,action,entity_type,entity_id,created_at,summary')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return <p role="alert">操作记录暂不可用，请稍后重试。</p>;
  return (
    <>
      <h1>操作记录</h1>
      <p>
        {staff.role === 'admin'
          ? '显示最近 100 条完整记录。'
          : staff.role === 'editor'
            ? '仅显示本人内容与素材操作，最近 100 条。'
            : '仅显示本人会员、候补名单和订单操作，最近 100 条。'}
        记录只读，不能修改或删除。
      </p>
      <div className="table-scroll" tabIndex={0} aria-label="操作记录">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>操作者</th>
              <th>动作</th>
              <th>对象</th>
              <th>变更摘要</th>
            </tr>
          </thead>
          <tbody>
            {data.map((event) => (
              <tr key={event.id}>
                <td>
                  {new Date(event.created_at).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                  })}
                </td>
                <td>{event.actor_id || '系统引导'}</td>
                <td>{event.action}</td>
                <td>
                  {event.entity_type} / {event.entity_id}
                </td>
                <td>
                  <code>{JSON.stringify(event.summary)}</code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <p>当前范围暂无操作记录。</p>}
    </>
  );
}
