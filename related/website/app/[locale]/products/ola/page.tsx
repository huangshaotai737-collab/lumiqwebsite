import Page from "@/app/products/ola/page";
import {withSiteContent} from "@/components/content/SiteContentBoundary";
export default withSiteContent(Page);
import {localizedMetadata} from "@/lib/metadata";
export const generateMetadata = localizedMetadata("productOla");
