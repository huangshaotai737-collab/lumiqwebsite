import Page from "@/components/home/GlassCards";
import {withSiteContent} from "@/components/content/SiteContentBoundary";
export const metadata = {robots: {index: false, follow: false}};
export default withSiteContent(Page);
