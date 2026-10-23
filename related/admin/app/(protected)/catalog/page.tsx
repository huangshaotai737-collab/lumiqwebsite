import { requireStaff } from "@/lib/auth/require-staff";
import { getCatalogWorkspace } from "@/features/catalog/service";
import { CatalogEditor } from "@/features/catalog/CatalogEditor";
export default async function CatalogPage() {
  const result = await getCatalogWorkspace();
  if (!result.ok)
    return <p role="alert">商品配置暂时不可用，或当前账号没有读取权限。</p>;
  const actor = await requireStaff(["admin", "operations"]);
  return (
    <>
      <h1>产品与方案</h1>
      <p>实际 SKU 价格需管理员确认，官网参考价格不会用于订单计价。</p>
      <CatalogEditor initial={result.data} readOnly={actor.role !== "admin"} />
    </>
  );
}
