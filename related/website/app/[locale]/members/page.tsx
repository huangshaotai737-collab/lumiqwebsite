import MembersPage from "./content";
import {withSiteContent} from "@/components/content/SiteContentBoundary";
export const metadata = { robots: { index: false, follow: false } };
export default withSiteContent(MembersPage);
