import Page from "@/app/page";
import {withSiteContent} from "@/components/content/SiteContentBoundary";
export default withSiteContent(Page);
import {localizedMetadata} from "@/lib/metadata";
export const generateMetadata = localizedMetadata("home");
