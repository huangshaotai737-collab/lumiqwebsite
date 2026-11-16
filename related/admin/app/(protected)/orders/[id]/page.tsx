import "@/features/orders/orders.css";
import {
  getOrderForStaff,
  getStaffOrderDetail,
} from "@/features/orders/service";
import { OrderDetail } from "@/features/orders/OrderDetail";
export default async function Detail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderForStaff(id);
  if (!order.ok) return <p role="alert">訂單不可用或當前賬號沒有運營權限。</p>;
  const detail = await getStaffOrderDetail(id);
  if (!detail.ok)
    return <p role="alert">訂單詳情不可用或當前賬號沒有運營權限。</p>;
  return <OrderDetail order={order.data} detail={detail.data} />;
}
