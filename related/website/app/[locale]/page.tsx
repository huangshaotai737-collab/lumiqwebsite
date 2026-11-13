import Page from "@/app/page";
import SiteContentBoundary from "@/components/content/SiteContentBoundary";
export default function LocalizedHome() {
  return <SiteContentBoundary home><Page /></SiteContentBoundary>;
}
import {localizedMetadata} from "@/lib/metadata";
export const generateMetadata = localizedMetadata("home");
