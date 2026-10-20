import Link from 'next/link';
import { LoginForm } from '@/features/auth/LoginForm';
import { authConfigured } from '@/lib/auth/server';
import { safeReturnPath } from '@/lib/generated/platform/auth-policy';
export const dynamic = 'force-dynamic';
export default async function LoginPage({searchParams}: {searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const query = await searchParams;
  const configured = authConfigured();
  const notice = !configured ? '认证服务尚未配置，当前无法登录。' : query.error === 'forbidden' ? '当前账号没有有效的员工权限。' : query.error === 'expired' ? '验证链接已失效，请重新登录。' : query.error === 'session' ? '登录已过期，请重新登录。' : query.status === 'signed-out' ? '已安全退出登录。' : '请输入工作邮箱和密码。';
  return <main className="login-page"><section className="login-card" aria-labelledby="login-title"><span className="brand">LumiQ<small>管理后台</small></span><h1 id="login-title">员工登录</h1><p className="intro">使用已获授权的工作账号进入管理后台。</p><LoginForm configured={configured} next={safeReturnPath(query.next,'/')} notice={notice} /><Link className="login-back" href="/">返回工作台</Link></section></main>;
}
