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
  if (!order.ok) return <p role="alert">订单不可用或当前账号没有运营权限。</p>;
  const detail = await getStaffOrderDetail(id);
  if (!detail.ok)
    return <p role="alert">订单详情不可用或当前账号没有运营权限。</p>;
  return <OrderDetail order={order.data} detail={detail.data} />;
}
