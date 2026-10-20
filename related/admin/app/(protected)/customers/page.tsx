import { listCustomers } from "@/features/customers/service";
import { CustomerTable } from "@/features/customers/CustomerTable";
export default async function CustomersPage() {
  const result = await listCustomers({ search: "", page: 1, pageSize: 25 });
  if (!result.ok)
    return (
      <p role="alert">
        会员资料暂时不可用，或当前账号没有运营权限。请稍后重试。
      </p>
    );
  return (
    <>
      <h1>会员运营</h1>
      <p>查看会员资料并添加内部备注。</p>
      <CustomerTable initial={result.data} />
    </>
  );
}
