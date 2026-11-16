import { requireStaff } from '@/lib/auth/require-staff';
import { createClient } from '@/lib/auth/server';
import { InviteForm } from '@/features/team/InviteForm';
import { TeamTable } from '@/features/team/TeamTable';
export default async function TeamPage() {
  try {
    await requireStaff(['admin']);
  } catch {
    return (
      <p role="alert">
        無法訪問團隊管理，僅管理員可操作。請檢查當前賬號權限或稍後重試。
      </p>
    );
  }
  const client = await createClient();
  const [members, invites] = await Promise.all([
    client.rpc('list_staff'),
    client
      .from('staff_invites')
      .select('id,email,role,expires_at,delivered_at,accepted_at,revoked_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);
  if (members.error || invites.error)
    return <p role="alert">團隊資料暫時不可用，請稍後重試。</p>;
  return (
    <>
      <h1>團隊與權限</h1>
      <p>角色與在職狀態即時生效。最後一位管理員受到保護。</p>
      <InviteForm />
      <h2>員工</h2>
      <TeamTable members={members.data || []} />
      <h2>最近邀請</h2>
      <div
        className="table-scroll team-list-scroll"
        tabIndex={0}
        aria-label="邀請記錄"
      >
        <table className="team-list-table">
          <thead>
            <tr>
              <th>郵箱</th>
              <th>狀態</th>
              <th>到期時間</th>
              <th>重發</th>
            </tr>
          </thead>
          <tbody>
            {invites.data?.map((invite) => (
              <tr key={invite.id}>
                <td data-label="郵箱">{invite.email}</td>
                <td data-label="狀態">
                  {invite.accepted_at
                    ? '已接受'
                    : invite.revoked_at
                      ? '已撤銷或發送失敗'
                      : new Date(invite.expires_at) < new Date()
                        ? '已過期'
                        : invite.delivered_at
                          ? '待接受'
                          : '待發送'}
                </td>
                <td data-label="到期時間">
                  {new Date(invite.expires_at).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                  })}
                </td>
                <td data-label="重發">使用上方表單重發；舊邀請即失效。</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
