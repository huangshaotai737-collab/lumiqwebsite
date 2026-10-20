import {
  withSiteContent,
  siteRequestLocale,
} from "@/components/content/SiteContentBoundary";
import { OrderList } from "@/features/orders/OrderList";
import "@/features/orders/orders.css";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
async function Orders() {
  return (
    <main className="orders-page">
      <OrderList locale={await siteRequestLocale()} />
    </main>
  );
}
export default withSiteContent(Orders);
