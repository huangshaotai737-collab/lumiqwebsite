import { requireStaff } from "@/lib/auth/require-staff";
import { getPrivacyWorkspace } from "@/features/customers/privacy";
import { PrivacyAction } from "@/features/customers/PrivacyAction";
import { listCustomers } from "@/features/customers/service";
import { CustomerTable } from "@/features/customers/CustomerTable";
export default async function CustomersPage() {
  const result = await listCustomers({ search: "", page: 1, pageSize: 25 });
  if (!result.ok)
    return (
      <p role="alert">
        會員資料暫時不可用，或當前賬號沒有運營權限。請稍後重試。
      </p>
    );
  const staff = await requireStaff(["admin", "operations"]);
  const privacy = staff.role === "admin" ? await getPrivacyWorkspace() : null;
  return (
    <>
      <h1>會員運營</h1>
      <p>查看會員資料並添加內部備註。</p>
      <CustomerTable initial={result.data} />
      {privacy &&
        (privacy.ok ? (
          <PrivacyAction initial={privacy.data} />
        ) : (
          <p role="alert">匿名化任務暫時不可用，請刷新重試。</p>
        ))}
    </>
  );
}
