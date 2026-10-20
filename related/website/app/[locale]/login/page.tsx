import {withSiteContent} from "@/components/content/SiteContentBoundary";
import { notFound } from 'next/navigation';
import { LoginForm } from '@/features/account/LoginForm';
import { requireUser } from '@/lib/auth/require-user';
import { authConfigured } from '@/lib/auth/server';
import { safeReturnPath } from '@/lib/generated/platform/auth-policy';
export const dynamic = 'force-dynamic';
export const metadata = {robots:{index:false,follow:false}};
async function LoginPage({params,searchParams}: {params:Promise<{locale:string}>;searchParams:Promise<Record<string,string|undefined>>}) {
  const {locale} = await params;
  if (locale !== 'en' && locale !== 'zh-hant' && locale !== 'ja') notFound();
  const query = await searchParams;
  let signedIn = false;
  try { await requireUser(); signedIn = true; } catch { /* Public login also works without a session. */ }
  const title = {en:'Sign in','zh-hant':'登入',ja:'ログイン'}[locale];
  return <main style={{padding:'140px 24px 80px',minHeight:'70vh'}}><h1 style={{textAlign:'center',fontSize:32,marginBottom:28}}>{title}</h1><LoginForm locale={locale} next={safeReturnPath(query.next,`/${locale}/members`)} configured={authConfigured()} signedIn={signedIn} error={query.error} status={query.status}/></main>;
}

export default withSiteContent(LoginPage);
