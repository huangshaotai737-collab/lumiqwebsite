import MembersPage from "./content";
import {withSiteContent} from "@/components/content/SiteContentBoundary";
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default withSiteContent(MembersPage);
