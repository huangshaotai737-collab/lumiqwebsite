import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdminShell } from '@/features/shell/AdminShell';
import { requireStaff } from '@/lib/auth/require-staff';
import { authConfigured } from '@/lib/auth/server';
import { HttpError } from '@/lib/http/result';
export const dynamic = 'force-dynamic';
export default async function ProtectedLayout({children}: {children: React.ReactNode}) {
  let staff;
  let unavailable = !authConfigured();
  if (!unavailable) {
    try { staff=await requireStaff(['admin','editor','operations']); }
    catch (error) {
      if (error instanceof HttpError && error.status === 401) redirect('/login?error=session');
      if (error instanceof HttpError && error.status === 403) redirect('/login?error=forbidden');
      unavailable = true;
    }
  }
  if (unavailable) return <AdminShell><section className="empty-state"><h1>管理後臺暫不可用</h1><p>{authConfigured() ? '認證服務暫時不可用，請稍後重試。' : '認證服務尚未配置，管理訪問已關閉。'}</p><Link href="/login">前往員工登錄</Link></section></AdminShell>;
  return <AdminShell status="員工身份已驗證" role={staff?.role}>{children}</AdminShell>;
}
