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
        无法访问团队管理，仅管理员可操作。请检查当前账号权限或稍后重试。
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
    return <p role="alert">团队资料暂时不可用，请稍后重试。</p>;
  return (
    <>
      <h1>团队与权限</h1>
      <p>角色与在职状态即时生效。最后一位管理员受到保护。</p>
      <InviteForm />
      <h2>员工</h2>
      <TeamTable members={members.data || []} />
      <h2>最近邀请</h2>
      <div
        className="table-scroll team-list-scroll"
        tabIndex={0}
        aria-label="邀请记录"
      >
        <table className="team-list-table">
          <thead>
            <tr>
              <th>邮箱</th>
              <th>状态</th>
              <th>到期时间</th>
              <th>重发</th>
            </tr>
          </thead>
          <tbody>
            {invites.data?.map((invite) => (
              <tr key={invite.id}>
                <td data-label="邮箱">{invite.email}</td>
                <td data-label="状态">
                  {invite.accepted_at
                    ? '已接受'
                    : invite.revoked_at
                      ? '已撤销或发送失败'
                      : new Date(invite.expires_at) < new Date()
                        ? '已过期'
                        : invite.delivered_at
                          ? '待接受'
                          : '待发送'}
                </td>
                <td data-label="到期时间">
                  {new Date(invite.expires_at).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                  })}
                </td>
                <td data-label="重发">使用上方表单重发；旧邀请即失效。</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
