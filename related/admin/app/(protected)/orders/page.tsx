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
  if (!result.ok) return <p role="alert">訂單不可用或當前賬號沒有運營權限。</p>;
  return (
    <>
      <h1>訂單運營</h1>
      <p>搜索訂單、查看待支付開放狀態、收件資料和取消記錄，添加內部備註。</p>
      <OrderTable initial={result.data} />
    </>
  );
}
