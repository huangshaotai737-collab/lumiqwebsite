import {
  withSiteContent,
  siteRequestLocale,
} from "@/components/content/SiteContentBoundary";
import { OrderDetail } from "@/features/orders/OrderDetail";
import "@/features/orders/orders.css";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="orders-page">
      <OrderDetail locale={await siteRequestLocale()} id={(await params).id} />
    </main>
  );
}
export default withSiteContent(Detail);
