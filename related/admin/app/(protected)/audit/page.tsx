import { requireStaff } from '@/lib/auth/require-staff';
import { createClient } from '@/lib/auth/server';
export default async function AuditPage() {
  let staff;
  try {
    staff = await requireStaff(['admin', 'editor', 'operations']);
  } catch {
    return <p role="alert">操作記錄暫不可用，請檢查權限或稍後重試。</p>;
  }
  const client = await createClient();
  const { data, error } = await client
    .from('audit_events')
    .select('id,actor_id,action,entity_type,entity_id,created_at,summary')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return <p role="alert">操作記錄暫不可用，請稍後重試。</p>;
  return (
    <>
      <h1>操作記錄</h1>
      <p>
        {staff.role === 'admin'
          ? '顯示最近 100 條完整記錄。'
          : staff.role === 'editor'
            ? '僅顯示本人內容與素材操作，最近 100 條。'
            : '僅顯示本人會員、候補名單和訂單操作，最近 100 條。'}
        記錄只讀，不能修改或刪除。
      </p>
      <div className="table-scroll" tabIndex={0} aria-label="操作記錄">
        <table>
          <thead>
            <tr>
              <th>時間</th>
              <th>操作者</th>
              <th>動作</th>
              <th>對象</th>
              <th>變更摘要</th>
            </tr>
          </thead>
          <tbody>
            {data.map((event) => (
              <tr key={event.id}>
                <td>
                  {new Date(event.created_at).toLocaleString('zh-TW', {
                    timeZone: 'Asia/Shanghai',
                  })}
                </td>
                <td>{event.actor_id || '系統引導'}</td>
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
      {data.length === 0 && <p>當前範圍暫無操作記錄。</p>}
    </>
  );
}
