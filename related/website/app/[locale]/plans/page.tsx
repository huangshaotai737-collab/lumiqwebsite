import Page from "@/app/plans/page";
import {withSiteContent} from "@/components/content/SiteContentBoundary";
export default withSiteContent(Page);
import {localizedMetadata} from "@/lib/metadata";
export const generateMetadata = localizedMetadata("plans");
