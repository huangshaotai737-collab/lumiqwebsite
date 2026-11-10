import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  distDir: process.env.LUMIQ_NEXT_DIST_DIR ?? ".next",
  images: {
    // Self-hosted QA can bypass cold-transform abort hangs; Vercel keeps its optimizer.
    unoptimized: process.env.LUMIQ_STATIC_IMAGES === "1",
    qualities: [75, 90, 95],
    minimumCacheTTL: 60,
  },
  async headers() {
    return [{source: "/assets/responsive/:path*", headers: [
      {key: "Cache-Control", value: "public, max-age=31536000, immutable"},
    ]}];
  },
};

export default withNextIntl(nextConfig);
