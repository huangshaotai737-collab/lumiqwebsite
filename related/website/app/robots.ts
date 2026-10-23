import type { MetadataRoute } from "next";
import {readPublishedContent} from "@/lib/content/read";
export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = (await readPublishedContent()).snapshot.settings.siteUrl;
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
