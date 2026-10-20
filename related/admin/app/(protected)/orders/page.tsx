import "@/features/orders/orders.css";
import { listOrders } from "@/features/orders/service";
import { OrderTable } from "@/features/orders/OrderTable";
export default async function Orders() {
  const result = await listOrders({
    search: "",
    status: "all",
    page: 1,
    pageSize: 25,
  });
  if (!result.ok) return <p role="alert">订单不可用或当前账号没有运营权限。</p>;
  return (
    <>
      <h1>订单运营</h1>
      <p>搜索订单、查看待支付开放状态、收件资料和取消记录，添加内部备注。</p>
      <OrderTable initial={result.data} />
    </>
  );
}
