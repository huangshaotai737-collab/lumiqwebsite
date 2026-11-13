import {
  withSiteContent,
  siteRequestLocale,
} from "@/components/content/SiteContentBoundary";
import { requireVerifiedUser } from "@/lib/auth/require-user";
import { getOwnProfile } from "@/features/account/service";
import { getOrderingCatalog } from "@/features/orders/service";
import { CheckoutForm } from "@/features/orders/CheckoutForm";
import { orderCopy } from "@/features/orders/copy";
import "@/features/orders/orders.css";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
async function Checkout() {
  const locale = await siteRequestLocale();
  let userId: string | null = null;
  try {
    userId = (await requireVerifiedUser()).userId;
  } catch {}
  const profile = userId ? await getOwnProfile() : null;
  return (
    <main className="orders-page">
      <h1>{orderCopy[locale].checkout}</h1>
      <CheckoutForm
        key={userId || "anonymous"}
        locale={locale}
        userId={userId}
        profile={profile?.ok ? profile.data : null}
        catalog={await getOrderingCatalog()}
      />
    </main>
  );
}
export default withSiteContent(Checkout);
