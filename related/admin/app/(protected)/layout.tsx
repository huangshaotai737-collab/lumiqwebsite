import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/features/shell/AdminShell';
import { requireStaff } from '@/lib/auth/require-staff';
import { authConfigured } from '@/lib/auth/server';
import { HttpError } from '@/lib/http/result';
export const dynamic = 'force-dynamic';
export default async function ProtectedLayout({children}: {children: React.ReactNode}) {
  let unavailable = !authConfigured();
  if (!unavailable) {
    try { await requireStaff(['admin','editor','operations']); }
    catch (error) {
      if (error instanceof HttpError && error.status === 401) redirect('/login?error=session');
      if (error instanceof HttpError && error.status === 403) redirect('/login?error=forbidden');
      unavailable = true;
    }
  }
  if (unavailable) return <AdminShell><section className="empty-state"><h1>管理后台暂不可用</h1><p>{authConfigured() ? '认证服务暂时不可用，请稍后重试。' : '认证服务尚未配置，管理访问已关闭。'}</p><Link href="/login">前往员工登录</Link></section></AdminShell>;
  return <AdminShell status="员工身份已验证">{children}</AdminShell>;
}
