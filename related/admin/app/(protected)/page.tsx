import { redirect } from 'next/navigation';
import { authConfigured } from '@/lib/auth/server';
import { HttpError } from '@/lib/http/result';
import { requireStaff } from '@/lib/auth/require-staff';
import { SignOutButton } from '@/features/auth/SignOutButton';
export default async function Dashboard() {
  if (!authConfigured()) return null;
  let staff;
  try { staff = await requireStaff(['admin','editor','operations']); }
  catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect('/login?error=session');
    if (error instanceof HttpError && error.status === 403) redirect('/login?error=forbidden');
    return <p role="status">认证服务暂时不可用，请稍后重试。</p>;
  }
  const roles = {admin:'管理员',editor:'内容编辑',operations:'运营'};
  return <><p className="eyebrow">工作台</p><h1>欢迎回来</h1><p>当前身份：{roles[staff.role]}</p><p>业务模块将按权限开放。</p><SignOutButton /></>;
}
