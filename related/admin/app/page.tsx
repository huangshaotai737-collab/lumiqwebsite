import Link from 'next/link';
import { AdminShell } from '@/features/shell/AdminShell';

// A3 replaces this route with app/(protected)/page.tsx after server authentication is implemented.
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  return (
    <AdminShell>
      <p className="eyebrow">工作台</p>
      <p className="intro">在这里管理官网内容与日常运营。</p>
      <section className="empty-state" aria-labelledby="unavailable-title">
        <span className="empty-mark" aria-hidden="true">◇</span>
        <h1 id="unavailable-title">管理后台暂不可用</h1>
        <p>{configured ? '员工认证尚未接入，管理访问已关闭。' : '认证服务尚未配置，管理访问已关闭。'}</p>
        <p>完成服务配置与员工身份验证后，才能查看管理数据。</p>
        <Link href="/login">前往员工登录</Link>
      </section>
    </AdminShell>
  );
}
