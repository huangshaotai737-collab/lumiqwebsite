import Link from 'next/link';
import { LoginForm } from '@/features/auth/LoginForm';
import { authConfigured } from '@/lib/auth/server';
import { safeReturnPath } from '@/lib/generated/platform/auth-policy';
export const dynamic = 'force-dynamic';
export default async function LoginPage({searchParams}: {searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query = await searchParams;
  const configured = authConfigured();
  const notice = !configured ? '認證服務尚未配置，當前無法登錄。' : query.error === 'forbidden' ? '當前賬號沒有有效的員工權限。' : query.error === 'expired' ? '驗證鏈接已失效，請重新登錄。' : query.error === 'session' ? '登錄已過期，請重新登錄。' : query.status === 'signed-out' ? '已安全退出登錄。' : '請輸入工作郵箱和密碼。';
  return <main className="login-page"><section className="login-card" aria-labelledby="login-title"><span className="brand">LumiQ<small>管理後臺</small></span><h1 id="login-title">員工登錄</h1><p className="intro">使用已獲授權的工作賬號進入管理後臺。</p><LoginForm configured={configured} next={safeReturnPath(query.next,'/')} notice={notice} /><Link className="login-back" href="/">返回工作臺</Link></section></main>;
}
