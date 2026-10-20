import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <span className="brand">LumiQ<small>管理后台</small></span>
        <h1 id="login-title">员工登录</h1>
        <p className="intro">使用已获授权的工作账号进入管理后台。</p>
        <p className="notice" id="login-status" role="status">
          {configured ? '员工认证尚未接入，当前无法登录。' : '认证服务尚未配置，当前无法登录。'}
        </p>
        <div className="login-form" aria-describedby="login-status">
          <label htmlFor="email">工作邮箱</label>
          <input id="email" name="email" type="email" autoComplete="username" inputMode="email" placeholder="name@company.com" />
          <label htmlFor="password">密码</label>
          <input id="password" name="password" type="password" autoComplete="current-password" />
          <button className="primary-button" type="button" disabled aria-describedby="login-status">登录</button>
        </div>
        <Link className="login-back" href="/">返回工作台</Link>
      </section>
    </main>
  );
}
