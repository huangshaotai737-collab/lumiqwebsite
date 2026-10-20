import {notFound} from 'next/navigation';
import {withSiteContent} from '@/components/content/SiteContentBoundary';
import {RegisterForm} from '@/features/account/RegisterForm';
import {accountCopy} from '@/features/account/copy';
import {authConfigured} from '@/lib/auth/server';
import '../members/members.css';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false}};
async function RegisterPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{next?:string}>}){const {locale}=await params;if(locale!=='en'&&locale!=='zh-hant'&&locale!=='ja')notFound();return <main className="members-page"><div className="members-shell"><h1>{accountCopy[locale].register}</h1><RegisterForm locale={locale} configured={authConfigured()} next={(await searchParams).next}/></div></main>;}
export default withSiteContent(RegisterPage);
