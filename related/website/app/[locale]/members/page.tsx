import MembersPage from "./content";
import {withSiteContent} from "@/components/content/SiteContentBoundary";
import {accountCopy} from "@/features/account/copy";
import type {Locale} from "@/i18n/routing";
export const dynamic = 'force-dynamic';
export async function generateMetadata({params}: {params: Promise<{locale: Locale}>}) {
  const {locale} = await params;
  return {title: `${(accountCopy[locale] ?? accountCopy.en).title} — LUMIQ Studio`, robots: {index: false, follow: false}};
}
export default withSiteContent(MembersPage);
