import {notFound} from 'next/navigation';
import {withSiteContent} from '@/components/content/SiteContentBoundary';
import {ResetPasswordForm} from '@/features/account/ResetPasswordForm';
import {accountCopy} from '@/features/account/copy';
import {authConfigured} from '@/lib/auth/server';
import {requireUser} from '@/lib/auth/require-user';
import '../members/members.css';
export const dynamic = 'force-dynamic';
export const metadata = {robots:{index:false, follow:false}};

async function ResetPage({params, searchParams}: {
  params:Promise<{locale:string}>;
  searchParams:Promise<{mode?:string; error?:string}>;
}) {
  const {locale} = await params;
  if (locale !== 'en' && locale !== 'zh-hant' && locale !== 'ja') notFound();
  const query = await searchParams;
  let signedIn = false;
  try {
    await requireUser();
    signedIn = true;
  } catch { /* A missing session leaves password update disabled. */ }
  return (
    <main className="members-page">
      <div className="members-shell">
        <h1>{accountCopy[locale].reset}</h1>
        <ResetPasswordForm locale={locale} configured={authConfigured()} update={query.mode === 'update'} expired={Boolean(query.error) || (query.mode === 'update' && !signedIn)}/>
      </div>
    </main>
  );
}
export default withSiteContent(ResetPage);
